import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { updateMatchStatus } from "@/lib/firebase/matching";
import { getOrCreateChat } from "@/lib/firebase/chat";
import { getUserData } from "@/lib/firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { matchId, seekerId, landlordId } = session.metadata || {};

      if (!matchId || !seekerId || !landlordId) {
        console.error("Missing metadata in checkout session");
        return NextResponse.json({ received: true });
      }

      // Update match status to paid
      await updateMatchStatus(matchId, "connected", session.payment_intent as string);

      // Create connection records for both users
      const connectionData = {
        matchId,
        amount: session.amount_total || 500,
        createdAt: serverTimestamp(),
      };

      // Connection for seeker
      await setDoc(doc(db, "connections", `${matchId}_${seekerId}`), {
        ...connectionData,
        userId: seekerId,
        connectedUserId: landlordId,
      });

      // Connection for landlord
      await setDoc(doc(db, "connections", `${matchId}_${landlordId}`), {
        ...connectionData,
        userId: landlordId,
        connectedUserId: seekerId,
      });

      // Create chat between users
      const [seeker, landlord] = await Promise.all([
        getUserData(seekerId),
        getUserData(landlordId),
      ]);

      if (seeker && landlord) {
        await getOrCreateChat(
          seekerId,
          seeker.displayName,
          seeker.photoURL,
          landlordId,
          landlord.displayName,
          landlord.photoURL,
          matchId
        );
      }

      console.log(`Payment completed for match ${matchId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

