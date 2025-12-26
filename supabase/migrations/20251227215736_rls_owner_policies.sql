drop policy "campaigns_select_for_authenticated_check" on "public"."campaigns";

drop policy "Allow DELETE own leads for permanent users" on "public"."leads";

drop policy "Allow INSERT for anonymous users if campaign exists" on "public"."leads";

drop policy "Allow SELECT own leads for permanent users" on "public"."leads";

drop policy "Allow UPDATE own leads for permanent users" on "public"."leads";

drop policy "Public can select non-archived projects" on "public"."projects";

drop policy "campaigns_delete_own" on "public"."campaigns";

drop policy "campaigns_insert_own" on "public"."campaigns";

drop policy "campaigns_select_own" on "public"."campaigns";

drop policy "campaigns_update_own" on "public"."campaigns";

drop policy "case_studies_delete_own" on "public"."case_studies";

drop policy "case_studies_insert_own" on "public"."case_studies";

drop policy "case_studies_update_own" on "public"."case_studies";

drop policy "case_studies_select_own" on "public"."case_studies";

drop policy "client_services_insert_own" on "public"."client_services";

drop policy "client_services_update_own" on "public"."client_services";

drop policy "client_services_delete_own" on "public"."client_services";

drop policy "client_services_select_own" on "public"."client_services";

drop policy "projects_delete_own" on "public"."projects";

drop policy "projects_insert_own" on "public"."projects";

drop policy "projects_select_own" on "public"."projects";

drop policy "projects_update_own" on "public"."projects";

drop policy "users_select_own" on "public"."users";

drop policy "users_update_own" on "public"."users";

drop policy "widgets_delete_own" on "public"."widgets";

drop policy "widgets_insert_own" on "public"."widgets";

drop policy "widgets_select_own" on "public"."widgets";

drop policy "widgets_update_own" on "public"."widgets";


  create policy "leads-delete-own"
  on "public"."leads"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = leads.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "leads-insert-own"
  on "public"."leads"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = leads.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "leads-select-own"
  on "public"."leads"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = leads.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "leads-update-own"
  on "public"."leads"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = leads.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "campaigns_delete_own"
  on "public"."campaigns"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.project_id = campaigns.project_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "campaigns_insert_own"
  on "public"."campaigns"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.project_id = campaigns.project_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "campaigns_select_own"
  on "public"."campaigns"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.project_id = campaigns.project_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "campaigns_update_own"
  on "public"."campaigns"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.project_id = campaigns.project_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "case_studies_delete_own"
  on "public"."case_studies"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.client_services
     JOIN public.campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "case_studies_select_own"
  on "public"."case_studies"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.client_services
     JOIN public.campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "case_studies_insert_own"
  on "public"."case_studies"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM ((public.client_services
     JOIN public.campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "case_studies_update_own"
  on "public"."case_studies"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.client_services
     JOIN public.campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "client_services_delete_own"
  on "public"."client_services"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "client_services_select_own"
  on "public"."client_services"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "client_services_insert_own"
  on "public"."client_services"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "client_services_update_own"
  on "public"."client_services"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "projects_delete_own"
  on "public"."projects"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = projects.user_id) AND (users.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "projects_insert_own"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = projects.user_id) AND (users.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "projects_select_own"
  on "public"."projects"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = projects.user_id) AND (users.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "projects_update_own"
  on "public"."projects"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.user_id = projects.user_id) AND (users.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "users_select_own"
  on "public"."users"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "users_update_own"
  on "public"."users"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "widgets_delete_own"
  on "public"."widgets"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "widgets_select_own"
  on "public"."widgets"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));

  create policy "widgets_update_own"
  on "public"."widgets"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));


  create policy "widgets_insert_own"
  on "public"."widgets"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.campaigns
     JOIN public.projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))));
