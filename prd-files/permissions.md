# Security Verifications Part 1

1. archive_project: is a security definer and does not check ownership of campaigns before pausing them and ownsership of projects before archieving them. Should ideally be converted into a security invoker so that RLS ownerships are maintained and no INSERT operations takes places with ownership in both campaigns and projects. Verify if there is no specific reason for making this a definer?

2. check_campaign_ownership: Revoke execute access to authenticated if it is only used by the worker. Keep it as an orphan.

3. handle_auth_user_update and handle_new_auth_user: remove execute access to authenticated as they are not used by any APIs and are only internal db triggers

4. insertLeadForCampaign should be rate limited if not already. 5 per min per IP seems okay.

5. publish_campaign, switch_campaign: These are security definer, same as archive_project this should be security invoker so that ownership for campaign inserts is ensured by RLS. Verify if there is no specific reason for making this a definer?

