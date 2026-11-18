// Supabase Edge Function: Initialize Paystack Transaction Securely
// Deploy via: supabase functions deploy paystack-initialize
// Secrets required: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: "Paystack secret key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { items, customer, couponCode, callbackUrl, userId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validate products, prices & stock directly from DB (never trust browser totals)
    let subtotalNgn = 0;
    const verifiedItems: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      product_image: string;
      selected_color: string;
      selected_variant: string;
      unit_price_ngn: number;
      quantity: number;
      line_total_ngn: number;
    }> = [];

    for (const item of items) {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price_ngn, is_published, inventory(quantity_available), product_images(image_url, is_primary)")
        .eq("id", item.productId)
        .single();

      if (prodErr || !product || !product.is_published) {
        return new Response(JSON.stringify({ error: "One or more products are unavailable" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const available = product.inventory?.[0]?.quantity_available ?? 0;
      if (item.quantity <= 0 || item.quantity > available) {
        return new Response(JSON.stringify({ error: `Insufficient stock for ${product.name}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let unitPrice = Number(product.price_ngn);
      let variantName = "";

      if (item.variantId) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, name, price_ngn, stock_qty")
          .eq("id", item.variantId)
          .eq("product_id", product.id)
          .single();
        if (variant) {
          if (item.quantity > variant.stock_qty) {
            return new Response(JSON.stringify({ error: `Insufficient stock for ${product.name} (${variant.name})` }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          unitPrice = Number(variant.price_ngn);
          variantName = variant.name;
        }
      }

      const lineTotal = unitPrice * item.quantity;
      subtotalNgn += lineTotal;
      const primaryImg = product.product_images?.find((i: { is_primary: boolean }) => i.is_primary)?.image_url || product.product_images?.[0]?.image_url || "";

      verifiedItems.push({
        product_id: product.id,
        variant_id: item.variantId || null,
        product_name: product.name,
        product_image: primaryImg,
        selected_color: item.selectedColor || "",
        selected_variant: variantName,
        unit_price_ngn: unitPrice,
        quantity: item.quantity,
        line_total_ngn: lineTotal,
      });
    }

    // 2. Delivery fee calculation (Nigeria zones)
    const stateLower = (customer.state || "").toLowerCase();
    const deliveryFeeNgn = subtotalNgn >= 350000 ? 0 : stateLower.includes("lagos") ? 3500 : 6500;

    // 3. Validate coupon server-side
    let discountNgn = 0;
    let appliedCoupon: string | null = null;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();
      if (coupon && subtotalNgn >= Number(coupon.min_order_ngn)) {
        discountNgn =
          coupon.discount_type === "percent"
            ? Math.round((subtotalNgn * Number(coupon.discount_value)) / 100)
            : Number(coupon.discount_value);
        if (coupon.max_discount_ngn) {
          discountNgn = Math.min(discountNgn, Number(coupon.max_discount_ngn));
        }
        appliedCoupon = coupon.code;
      }
    }

    const totalNgn = Math.max(0, subtotalNgn + deliveryFeeNgn - discountNgn);
    const amountKobo = Math.round(totalNgn * 100);
    const orderNumber = `ZV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const reference = `PAY-${orderNumber}`;

    // 4. Create pending order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId || null,
        customer_name: customer.fullName,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_whatsapp: customer.whatsappNumber,
        delivery_address: customer.address,
        delivery_city: customer.city,
        delivery_state: customer.state,
        delivery_notes: customer.additionalInfo || "",
        coupon_code: appliedCoupon,
        subtotal_ngn: subtotalNgn,
        delivery_fee_ngn: deliveryFeeNgn,
        discount_ngn: discountNgn,
        total_ngn: totalNgn,
        payment_status: "pending",
        order_status: "pending_payment",
        paystack_reference: reference,
      })
      .select()
      .single();

    if (orderErr || !order) {
      throw new Error(orderErr?.message || "Failed to create order");
    }

    await supabase.from("order_items").insert(
      verifiedItems.map((vi) => ({ ...vi, order_id: order.id }))
    );

    // 5. Initialize Paystack transaction
    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: customer.email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          customer_name: customer.fullName,
        },
      }),
    });

    const psData = await psRes.json();
    if (!psData.status) {
      throw new Error(psData.message || "Paystack initialization failed");
    }

    await supabase.from("payments").insert({
      order_id: order.id,
      paystack_reference: reference,
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "initialized",
    });

    return new Response(
      JSON.stringify({
        orderId: order.id,
        orderNumber,
        reference,
        authorizationUrl: psData.data.authorization_url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
