import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

const db = createClient(supabaseUrl, supabaseSecret);

webpush.setVapidDetails(
  "mailto:sabudin_gusani@hotmail.com",
  vapidPublic,
  vapidPrivate
);

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return Response.json(
        { error: "POST only" },
        { status: 405 }
      );
    }

    try {
      const payload = await req.json();
      const booking = payload.record || payload;

      const salonId = booking.salon_id;

      if (!salonId) {
        return Response.json(
          { error: "Nema salon_id" },
          { status: 400 }
        );
      }

      const { data: subscriptions, error } = await db
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("salon_id", salonId);

      if (error) throw error;

      if (!subscriptions?.length) {
        return Response.json({
          ok: true,
          sent: 0,
          message: "Salon nema push pretplatu"
        });
      }

      const notification = JSON.stringify({
        title: "TERMINO BA",
        body:
          "🔔 Nova rezervacija: " +
          (booking.customer_name || "Novi klijent"),
        url: "/termino-ba/dashboard.html"
      });

      let sent = 0;

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            notification
          );

          sent++;
        } catch (pushError: any) {
          console.error("Push error:", pushError);

          if (
            pushError?.statusCode === 404 ||
            pushError?.statusCode === 410
          ) {
            await db
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }

      return Response.json({
        ok: true,
        sent
      });
    } catch (error: any) {
      console.error(error);

      return Response.json(
        {
          ok: false,
          error: error?.message || "Greška"
        },
        { status: 500 }
      );
    }
  }
};