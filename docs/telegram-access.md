# T4SC Telegram access operations

## Access rule
The website requires both the authenticated owner relationship and two matching server-side records:
- `applications.auth_user_id` equals the signed-in Supabase Auth user.
- `application_admissions.status` is exactly `offer_accepted`.
- The corresponding `admission_offers.status` is exactly `accepted`.

The Next.js route checks the authenticated user again through the private Edge Function, then returns a 303 redirect with private no-store headers. It never returns the invite URL as JSON.

## Deployment configuration
Configure in Vercel **Production only**:
- `T4SC_TELEGRAM_INVITE_URL`: Sensitive server-side variable containing the controlled private invite.
- `T4SC_TELEGRAM_JOIN_REQUESTS_CONFIRMED`: server-side plain variable set to `true` only after the manual checklist below is complete.

Do not add either variable with a `NEXT_PUBLIC_` prefix. Do not add these values to GitHub, deployment logs, preview environments, or public pages.

## Required Telegram-side launch checklist
1. Confirm the invite targets the private chat **T4SC | Main Community**, not the announcements channel or a test chat.
2. Create an additional private invite with **Request Admin Approval** enabled.
3. Open it from a Telegram account that is not a member. Verify it offers a join request, not direct entry; verify an administrator can approve/decline.
4. Revoke the previous default/open invite and every other unrestricted invite previously shared, including the old developer link.
5. Confirm the official announcements channel is included through the main-group membership arrangement; do not publish a second link.
6. Add the new controlled URL to Vercel Production as a Sensitive variable and set the confirmation flag to `true`.
7. Test an accepted account, an ineligible account, a different account, and a forwarded link. The forwarded link must still require admin approval.
8. Keep manual approval. Compare each Telegram requester against the private Offer Accepted membership record. Leave uncertain identities pending and verify through the authenticated support route.

## Fail-closed behaviour
Until the controlled link and Telegram approval flow are confirmed, the dashboard's accepted-member button leads to an explanatory setup page. No Telegram link is exposed. If the feature flag is false or the URL is missing/invalid, access remains unavailable.

## Rotation
Set the confirmation flag to `false`, create and test the replacement controlled link, revoke the compromised link, update the Sensitive Production URL, then set the confirmation flag back to `true`.
