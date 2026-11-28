import assert from "node:assert/strict";
import test from "node:test";
import { getSafeTelegramInviteUrl, isOfferAcceptedForCommunity } from "../lib/community-access.ts";

test("community access requires both authoritative Offer Accepted records", () => {
  assert.equal(isOfferAcceptedForCommunity("offer_accepted", "accepted"), true);
});

test("a recommendation is not enough", () => {
  assert.equal(isOfferAcceptedForCommunity("recommended_for_admission", "offered"), false);
});

test("an issued offer awaiting response is not enough", () => {
  assert.equal(isOfferAcceptedForCommunity("admission_given", "offered"), false);
});

test("declined and expired offers do not qualify", () => {
  assert.equal(isOfferAcceptedForCommunity("offer_declined", "declined"), false);
  assert.equal(isOfferAcceptedForCommunity("offer_expired", "expired"), false);
});

test("legacy application labels and partial states never qualify", () => {
  assert.equal(isOfferAcceptedForCommunity("admitted", "accepted"), false);
  assert.equal(isOfferAcceptedForCommunity("onboarding", "accepted"), false);
  assert.equal(isOfferAcceptedForCommunity("offer_accepted", "offered"), false);
  assert.equal(isOfferAcceptedForCommunity(null, "accepted"), false);
});

test("only HTTPS private Telegram invite links are accepted", () => {
  assert.equal(getSafeTelegramInviteUrl("https://t.me/+private-token")?.hostname, "t.me");
  assert.equal(getSafeTelegramInviteUrl("https://t.me/joinchat/private-token")?.hostname, "t.me");
  assert.equal(getSafeTelegramInviteUrl("http://t.me/+private-token"), null);
  assert.equal(getSafeTelegramInviteUrl("https://evil.example/+private-token"), null);
  assert.equal(getSafeTelegramInviteUrl("https://t.me/officialchannel"), null);
  assert.equal(getSafeTelegramInviteUrl("https://username:password@t.me/+private-token"), null);
  assert.equal(getSafeTelegramInviteUrl(undefined), null);
});
