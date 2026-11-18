// Supabase Edge Function: Verify Paystack Payment & Deduct Stock Atomically
// Deploy via: supabase functions deploy paystack-verify

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
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing payment reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch order by reference
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("paystack_reference", reference)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency guard: if already paid, return verified order immediately
    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ verified: true, order }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify directly with Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || !verifyData.data) {
      return new Response(JSON.stringify({ verified: false, error: "Paystack verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = verifyData.data;
    const expectedKobo = Math.round(Number(order.total_ngn) * 100);

    // 3. Validate reference, currency, amount & status match
    if (
      tx.reference !== reference ||
      tx.currency !== "NGN" ||
      Number(tx.amount) !== expectedKobo ||
      tx.status !== "success"
    ) {
      const mappedStatus = tx.status === "abandoned" ? "abandoned" : "failed";
      await supabase
        .from("orders")
        .update({ payment_status: mappedStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      await supabase
        .from("payments")
        .update({ status: mappedStatus, gateway_response: tx.gateway_response || tx.status, raw_payload: tx })
        .eq("paystack_reference", reference);

      return new Response(JSON.stringify({ verified: false, status: mappedStatus, order }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Atomic stock deduction + mark paid
    const { error: rpcErr } = await supabase.rpc("confirm_order_payment_atomic", {
      p_order_id: order.id,
      p_reference: reference,
    });

    if (rpcErr) {
      throw new Error(rpcErr.message);
    }

    await supabase
      .from("payments")
      .update({
        status: "success",
        channel: tx.channel || "card",
        gateway_response: tx.gateway_response || "Approved",
        raw_payload: tx,
        verified_at: new Date().toISOString(),
      })
      .eq("paystack_reference", reference);

    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    return new Response(JSON.stringify({ verified: true, order: updatedOrder }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
