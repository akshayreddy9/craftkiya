grant update (approval_status, client_feedback, approved_at)
  on public.custom_artwork_approvals to authenticated;

drop policy if exists approvals_customer_respond on public.custom_artwork_approvals;
create policy approvals_customer_respond on public.custom_artwork_approvals
  for update to authenticated
  using (
    approval_status = 'pending'
    and exists (
      select 1 from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.id = order_item_id and o.user_id = (select auth.uid())
    )
  )
  with check (
    approval_status in ('approved', 'rejected')
    and approved_at is not null
    and exists (
      select 1 from public.order_items i
      join public.orders o on o.id = i.order_id
      where i.id = order_item_id and o.user_id = (select auth.uid())
    )
  );