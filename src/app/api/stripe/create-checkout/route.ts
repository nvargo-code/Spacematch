import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getMatch } from "@/lib/firebase/matching";

// Lazy initialization to avoid build-time errors
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { matchId, userId } = await request.json();

    if (!matchId || !userId) {
      return NextResponse.json(
        { error: "Missing matchId or userId" },
        { status: 400 }
      );
    }

    // Verify the match exists
    const match = await getMatch(matchId);
    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    // Verify the user is part of this match
    if (match.seekerId !== userId && match.landlordId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if already paid
    if (match.status === "paid" || match.status === "connected") {
      return NextResponse.json(
        { error: "This match has already been paid for" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "SpaceMatch Connection Fee",
              description: "Unlock contact information and start a conversation",
            },
            unit_amount: 500, // $5.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/messages?matchId=${matchId}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/post/${match.seekerPostId}?cancelled=true`,
      metadata: {
        matchId,
        userId,
        seekerId: match.seekerId,
        landlordId: match.landlordId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
