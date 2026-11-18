// Supabase Edge Function: Paystack Webhook Handler with HMAC-SHA512 Signature Verification
// Deploy via: supabase functions deploy paystack-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedHex === signature;
}

serve(async (req) => {
  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const signature = req.headers.get("x-paystack-signature") || "";
    const rawBody = await req.text();

    if (!signature || !(await verifySignature(rawBody, signature, paystackSecret))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.event === "charge.success") {
      const tx = event.data;
      const reference = tx.reference;

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("paystack_reference", reference)
        .single();

      if (order && order.payment_status !== "paid") {
        const expectedKobo = Math.round(Number(order.total_ngn) * 100);
        if (tx.currency === "NGN" && Number(tx.amount) === expectedKobo) {
          await supabase.rpc("confirm_order_payment_atomic", {
            p_order_id: order.id,
            p_reference: reference,
          });
          await supabase
            .from("payments")
            .update({
              status: "success",
              channel: tx.channel || "card",
              gateway_response: tx.gateway_response || "Webhook Verified",
              raw_payload: tx,
              verified_at: new Date().toISOString(),
            })
            .eq("paystack_reference", reference);
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response((err as Error).message, { status: 500 });
  }
});
