export async function redirectToCheckout(sessionUrl: string): Promise<void> {
  // Redirect directly to the Stripe checkout URL
  window.location.href = sessionUrl;
}

export async function createCheckoutSession(
  matchId: string,
  userId: string
): Promise<{ sessionId: string; url: string }> {
  const response = await fetch("/api/stripe/create-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ matchId, userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create checkout session");
  }

  return response.json();
}
