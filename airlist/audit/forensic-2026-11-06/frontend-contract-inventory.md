# API lexical inventory

This is a complete lexical inventory for literal fetch/cachedJson call sites in app/components/lib/hooks and Nest decorated controller routes. Dynamic URL variables and dynamic endpoint selectors require manual tracing. Method guesses inspect the adjacent options; this inventory is not proof of payload compatibility.

Backend decorated routes: 112. Frontend literal call sites: 164.

## Backend

| Method | Path | Evidence |
|---|---|---|
| POST | `/storage` | `backend_alexis/src/storage/storage.controller.ts:27` |
| GET | `/storage` | `backend_alexis/src/storage/storage.controller.ts:33` |
| GET | `/storage/:id` | `backend_alexis/src/storage/storage.controller.ts:39` |
| GET | `/storage/:id/items` | `backend_alexis/src/storage/storage.controller.ts:45` |
| POST | `/storage/:id/delivery` | `backend_alexis/src/storage/storage.controller.ts:53` |
| PATCH | `/storage/:id/update` | `backend_alexis/src/storage/storage.controller.ts:65` |
| PATCH | `/storage/:id/cancel` | `backend_alexis/src/storage/storage.controller.ts:75` |
| POST | `/payments/intent` | `backend_alexis/src/payments/payments.controller.ts:28` |
| GET | `/payments/booking/:bookingId/status` | `backend_alexis/src/payments/payments.controller.ts:39` |
| POST | `/payments/webhook` | `backend_alexis/src/payments/payments.controller.ts:53` |
| GET | `/invoices/me` | `backend_alexis/src/invoices/invoices.controller.ts:11` |
| POST | `/invoices/:id/pay` | `backend_alexis/src/invoices/invoices.controller.ts:18` |
| GET | `/invoices/all` | `backend_alexis/src/invoices/invoices.controller.ts:26` |
| POST | `/invoices/:id/remind` | `backend_alexis/src/invoices/invoices.controller.ts:33` |
| POST | `/invoices/:id/mark-paid` | `backend_alexis/src/invoices/invoices.controller.ts:41` |
| POST | `/driver/apply` | `backend_alexis/src/driver/driver.controller.ts:50` |
| GET | `/driver/status` | `backend_alexis/src/driver/driver.controller.ts:59` |
| GET | `/driver/documents` | `backend_alexis/src/driver/driver.controller.ts:70` |
| POST | `/driver/documents/upload` | `backend_alexis/src/driver/driver.controller.ts:77` |
| POST | `/driver/documents/submit` | `backend_alexis/src/driver/driver.controller.ts:86` |
| POST | `/driver/upload-file` | `backend_alexis/src/driver/driver.controller.ts:94` |
| GET | `/driver/files/:filename` | `backend_alexis/src/driver/driver.controller.ts:150` |
| PATCH | `/driver/location` | `backend_alexis/src/driver/driver.controller.ts:189` |
| GET | `/driver/assignments` | `backend_alexis/src/driver/driver.controller.ts:199` |
| GET | `/driver/history` | `backend_alexis/src/driver/driver.controller.ts:207` |
| PATCH | `/driver/assignments/:bookingId/status` | `backend_alexis/src/driver/driver.controller.ts:215` |
| POST | `/driver/assignments/:bookingId/undo` | `backend_alexis/src/driver/driver.controller.ts:249` |
| PATCH | `/driver/assignments/:bookingId/items/:itemId/flag` | `backend_alexis/src/driver/driver.controller.ts:263` |
| GET | `/driver/availability` | `backend_alexis/src/driver/driver.controller.ts:277` |
| PUT | `/driver/availability` | `backend_alexis/src/driver/driver.controller.ts:285` |
| PATCH | `/driver/availability/:day` | `backend_alexis/src/driver/driver.controller.ts:293` |
| GET | `/users/me` | `backend_alexis/src/users/users.controller.ts:14` |
| PATCH | `/users/me` | `backend_alexis/src/users/users.controller.ts:20` |
| GET | `/users/me/bonuses` | `backend_alexis/src/users/users.controller.ts:26` |
| POST | `/users/me/referral` | `backend_alexis/src/users/users.controller.ts:32` |
| POST | `/users/me/withdraw` | `backend_alexis/src/users/users.controller.ts:43` |
| GET | `/users/me/withdrawals` | `backend_alexis/src/users/users.controller.ts:52` |
| GET | `/fleet/allocate/:bookingId` | `backend_alexis/src/fleet/fleet.controller.ts:14` |
| POST | `/auth/register` | `backend_alexis/src/auth/auth.controller.ts:94` |
| POST | `/auth/login` | `backend_alexis/src/auth/auth.controller.ts:105` |
| POST | `/auth/refresh` | `backend_alexis/src/auth/auth.controller.ts:119` |
| POST | `/auth/logout` | `backend_alexis/src/auth/auth.controller.ts:136` |
| POST | `/auth/forgot-password` | `backend_alexis/src/auth/auth.controller.ts:158` |
| POST | `/auth/reset-password` | `backend_alexis/src/auth/auth.controller.ts:165` |
| POST | `/auth/exchange-code` | `backend_alexis/src/auth/auth.controller.ts:181` |
| GET | `/auth/google` | `backend_alexis/src/auth/auth.controller.ts:195` |
| GET | `/auth/callback/google` | `backend_alexis/src/auth/auth.controller.ts:201` |
| GET | `/auth/facebook` | `backend_alexis/src/auth/auth.controller.ts:210` |
| GET | `/auth/callback/facebook` | `backend_alexis/src/auth/auth.controller.ts:214` |
| GET | `/auth/apple` | `backend_alexis/src/auth/auth.controller.ts:223` |
| POST | `/auth/callback/apple` | `backend_alexis/src/auth/auth.controller.ts:227` |
| POST | `/manager/apply` | `backend_alexis/src/manager/manager.controller.ts:64` |
| GET | `/manager/application-status` | `backend_alexis/src/manager/manager.controller.ts:73` |
| GET | `/manager/stats` | `backend_alexis/src/manager/manager.controller.ts:81` |
| GET | `/manager/bookings` | `backend_alexis/src/manager/manager.controller.ts:89` |
| PATCH | `/manager/bookings/:id/confirm` | `backend_alexis/src/manager/manager.controller.ts:97` |
| PATCH | `/manager/bookings/:id/cancel` | `backend_alexis/src/manager/manager.controller.ts:105` |
| PATCH | `/manager/bookings/:id/decline` | `backend_alexis/src/manager/manager.controller.ts:113` |
| PATCH | `/manager/bookings/:id/requeue` | `backend_alexis/src/manager/manager.controller.ts:121` |
| PATCH | `/manager/bookings/:id/storage` | `backend_alexis/src/manager/manager.controller.ts:129` |
| PATCH | `/manager/bookings/:id/assign-driver` | `backend_alexis/src/manager/manager.controller.ts:142` |
| POST | `/manager/bookings/bulk-assign` | `backend_alexis/src/manager/manager.controller.ts:159` |
| GET | `/manager/drivers` | `backend_alexis/src/manager/manager.controller.ts:170` |
| PATCH | `/manager/drivers/:id/status` | `backend_alexis/src/manager/manager.controller.ts:178` |
| GET | `/manager/drivers-with-documents` | `backend_alexis/src/manager/manager.controller.ts:191` |
| GET | `/manager/drivers/:id/documents` | `backend_alexis/src/manager/manager.controller.ts:199` |
| PATCH | `/manager/documents/:id/review` | `backend_alexis/src/manager/manager.controller.ts:209` |
| GET | `/manager/active-rides` | `backend_alexis/src/manager/manager.controller.ts:219` |
| GET | `/manager/rides/:id` | `backend_alexis/src/manager/manager.controller.ts:229` |
| GET | `/manager/completed-rides` | `backend_alexis/src/manager/manager.controller.ts:237` |
| GET | `/notifications/unread` | `backend_alexis/src/notifications/notification.controller.ts:17` |
| PATCH | `/notifications/:id/read` | `backend_alexis/src/notifications/notification.controller.ts:22` |
| PATCH | `/notifications/read-all` | `backend_alexis/src/notifications/notification.controller.ts:28` |
| GET | `/admin/stats` | `backend_alexis/src/admin/admin.controller.ts:40` |
| GET | `/admin/bookings` | `backend_alexis/src/admin/admin.controller.ts:46` |
| GET | `/admin/bookings/:id` | `backend_alexis/src/admin/admin.controller.ts:54` |
| PATCH | `/admin/bookings/:id/assign-driver` | `backend_alexis/src/admin/admin.controller.ts:60` |
| GET | `/admin/drivers` | `backend_alexis/src/admin/admin.controller.ts:66` |
| PATCH | `/admin/drivers/:id/status` | `backend_alexis/src/admin/admin.controller.ts:72` |
| GET | `/admin/manager-applications` | `backend_alexis/src/admin/admin.controller.ts:83` |
| PATCH | `/admin/manager-applications/:id/approve` | `backend_alexis/src/admin/admin.controller.ts:91` |
| PATCH | `/admin/manager-applications/:id/reject` | `backend_alexis/src/admin/admin.controller.ts:100` |
| POST | `/admin/managers` | `backend_alexis/src/admin/admin.controller.ts:111` |
| GET | `/admin/managers` | `backend_alexis/src/admin/admin.controller.ts:117` |
| DELETE | `/admin/managers/:id` | `backend_alexis/src/admin/admin.controller.ts:123` |
| POST | `/promo/validate` | `backend_alexis/src/promo/promo.controller.ts:24` |
| POST | `/promo/admin/create` | `backend_alexis/src/promo/promo.controller.ts:34` |
| POST | `/pricing/calculate` | `backend_alexis/src/pricing/pricing.controller.ts:150` |
| GET | `/pricing/settings` | `backend_alexis/src/pricing/pricing.controller.ts:190` |
| PUT | `/pricing/settings` | `backend_alexis/src/pricing/pricing.controller.ts:196` |
| GET | `/pricing/ai-suggestion` | `backend_alexis/src/pricing/pricing.controller.ts:205` |
| POST | `/bookings` | `backend_alexis/src/bookings/bookings.controller.ts:40` |
| GET | `/bookings` | `backend_alexis/src/bookings/bookings.controller.ts:49` |
| GET | `/bookings/:id` | `backend_alexis/src/bookings/bookings.controller.ts:57` |
| PATCH | `/bookings/:id/reschedule` | `backend_alexis/src/bookings/bookings.controller.ts:63` |
| PATCH | `/bookings/:id/cancel` | `backend_alexis/src/bookings/bookings.controller.ts:75` |
| GET | `/bookings/:id/tracking` | `backend_alexis/src/bookings/bookings.controller.ts:85` |
| PATCH | `/bookings/:id/addresses` | `backend_alexis/src/bookings/bookings.controller.ts:94` |
| PATCH | `/bookings/:id/items` | `backend_alexis/src/bookings/bookings.controller.ts:107` |
| POST | `/bookings/:id/invoice` | `backend_alexis/src/bookings/bookings.controller.ts:119` |
| GET | `/approval/pending` | `backend_alexis/src/approval/approval.controller.ts:29` |
| PATCH | `/approval/bookings/:bookingId/items/:itemId/approve` | `backend_alexis/src/approval/approval.controller.ts:48` |
| PATCH | `/approval/bookings/:bookingId/items/:itemId/reject` | `backend_alexis/src/approval/approval.controller.ts:95` |
| POST | `/quotes/draft` | `backend_alexis/src/quotes/quote.controller.ts:27` |
| GET | `/quotes/drafts` | `backend_alexis/src/quotes/quote.controller.ts:38` |
| GET | `/quotes/drafts/:id` | `backend_alexis/src/quotes/quote.controller.ts:43` |
| DELETE | `/quotes/drafts/:id` | `backend_alexis/src/quotes/quote.controller.ts:48` |
| GET | `/items/categories` | `backend_alexis/src/items/items.controller.ts:27` |
| GET | `/items` | `backend_alexis/src/items/items.controller.ts:35` |
| POST | `/items/custom` | `backend_alexis/src/items/items.controller.ts:41` |
| GET | `/items/packing-materials` | `backend_alexis/src/items/items.controller.ts:49` |
| POST | `/items/identify-from-photo` | `backend_alexis/src/items/items.controller.ts:55` |

## Frontend

| Method | URL expression | Evidence |
|---|---|---|
| GET (inferred) | `${API}/driver/status` | `nglobi/app/driver/page.tsx:199` |
| GET (inferred) | `${API}/driver/assignments` | `nglobi/app/driver/page.tsx:222` |
| PATCH | `${API}/driver/assignments/${bookingId}/status` | `nglobi/app/driver/page.tsx:249` |
| POST | `${API}/driver/assignments/${bookingId}/undo` | `nglobi/app/driver/page.tsx:274` |
| PATCH | `${API}/driver/assignments/${bookingId}/items/${itemId}/flag` | `nglobi/app/driver/page.tsx:386` |
| GET (inferred) | `${API}/users/me` | `nglobi/app/driver/layout.tsx:47` |
| GET (inferred) | `${API}/driver/status` | `nglobi/app/driver/layout.tsx:65` |
| POST | `${API}/auth/logout` | `nglobi/app/driver/layout.tsx:100` |
| GET (inferred) | `${API}/driver/history` | `nglobi/app/driver/history/page.tsx:87` |
| POST | `${API}/driver/apply` | `nglobi/app/driver/apply/page.tsx:62` |
| GET (inferred) | `${API}/driver/documents` | `nglobi/app/driver/apply/documents/page.tsx:61` |
| POST | `${API}/driver/upload-file` | `nglobi/app/driver/apply/documents/page.tsx:109` |
| POST | `${API}/driver/documents/upload` | `nglobi/app/driver/apply/documents/page.tsx:129` |
| POST | `${API}/driver/documents/submit` | `nglobi/app/driver/apply/documents/page.tsx:169` |
| PATCH | `${API}/driver/location` | `nglobi/app/driver/location/page.tsx:22` |
| GET (inferred) | `${API}/driver/availability` | `nglobi/app/driver/availability/page.tsx:40` |
| PUT | `${API}/driver/availability` | `nglobi/app/driver/availability/page.tsx:88` |
| GET (inferred) | `${API}/manager/rides/${bookingId}` | `nglobi/app/manager/page.tsx:97` |
| PATCH | `${API}/manager/bookings/${storageModalBooking.id}/storage` | `nglobi/app/manager/page.tsx:134` |
| GET (inferred) | `${API}/manager/bookings?includeHistorical=true` | `nglobi/app/manager/page.tsx:195` |
| GET (inferred) | `${API}/manager/drivers` | `nglobi/app/manager/page.tsx:196` |
| GET (inferred) | `${API}/pricing/settings` | `nglobi/app/manager/page.tsx:197` |
| GET (inferred) | `${API}/invoices/all` | `nglobi/app/manager/page.tsx:198` |
| PATCH | `${API}/manager/bookings/${id}/cancel` | `nglobi/app/manager/page.tsx:218` |
| PATCH | `${API}/manager/bookings/${id}/decline` | `nglobi/app/manager/page.tsx:235` |
| PATCH | `${API}/manager/bookings/${booking.id}/confirm` | `nglobi/app/manager/page.tsx:253` |
| POST | `${API}/invoices/${invoiceId}/remind` | `nglobi/app/manager/page.tsx:267` |
| PATCH | `${API}/manager/bookings/${bookingId}/assign-driver` | `nglobi/app/manager/page.tsx:343` |
| POST | `${API}/manager/bookings/bulk-assign` | `nglobi/app/manager/page.tsx:430` |
| GET (inferred) | `${API}/pricing/ai-suggestion` | `nglobi/app/manager/page.tsx:1497` |
| PUT | `${API}/pricing/settings` | `nglobi/app/manager/page.tsx:1771` |
| POST | `${API}/invoices/${invoice.id}/mark-paid` | `nglobi/app/manager/page.tsx:1852` |
| GET (inferred) | `${API}/users/me` | `nglobi/app/manager/layout.tsx:86` |
| GET (inferred) | `${API}/manager/application-status` | `nglobi/app/manager/layout.tsx:107` |
| POST | `${API}/auth/logout` | `nglobi/app/manager/layout.tsx:136` |
| GET (inferred) | `${process.env.API_URL}/invoices/all` | `nglobi/app/manager/invoices/page.tsx:28` |
| POST | `${process.env.API_URL}/invoices/${invoiceId}/remind` | `nglobi/app/manager/invoices/page.tsx:50` |
| GET (inferred) | `${API}/manager/drivers` | `nglobi/app/manager/fleet/page.tsx:52` |
| GET (inferred) | `${API}/manager/drivers-with-documents` | `nglobi/app/manager/fleet/page.tsx:53` |
| PATCH | `${API}/manager/drivers/${id}/status` | `nglobi/app/manager/fleet/page.tsx:63` |
| PATCH | `${API}/manager/documents/${docId}/review` | `nglobi/app/manager/fleet/page.tsx:75` |
| GET (inferred) | `${API}/manager/drivers-with-documents` | `nglobi/app/manager/documents/page.tsx:84` |
| PATCH | `${API}/manager/documents/${docId}/review` | `nglobi/app/manager/documents/page.tsx:97` |
| GET (inferred) | `${API}/manager/drivers/${selectedDriver.id}/documents` | `nglobi/app/manager/documents/page.tsx:104` |
| PATCH | `${API}/manager/drivers/${driverId}/status` | `nglobi/app/manager/documents/page.tsx:118` |
| GET (inferred) | `${API}/manager/drivers/${driverId}/documents` | `nglobi/app/manager/documents/page.tsx:125` |
| GET (inferred) | `${API}/manager/application-status` | `nglobi/app/manager/apply/page.tsx:46` |
| GET (inferred) | `${API}/manager/application-status` | `nglobi/app/manager/apply/page.tsx:79` |
| POST | `${API}/auth/register` | `nglobi/app/manager/apply/page.tsx:106` |
| POST | `${API}/auth/login` | `nglobi/app/manager/apply/page.tsx:117` |
| POST | `${API}/manager/apply` | `nglobi/app/manager/apply/page.tsx:136` |
| GET (inferred) | `${API}/manager/active-rides` | `nglobi/app/manager/live-rides/page.tsx:47` |
| GET (inferred) | `${API}/manager/completed-rides` | `nglobi/app/manager/live-rides/page.tsx:55` |
| PATCH | `${API}/manager/bookings/${id}/cancel` | `nglobi/app/manager/live-rides/page.tsx:186` |
| GET (inferred) | `${API}/pricing/settings` | `nglobi/app/manager/prices/page.tsx:21` |
| GET (inferred) | `${API}/manager/bookings` | `nglobi/app/manager/prices/page.tsx:49` |
| PUT | `${API}/pricing/settings` | `nglobi/app/manager/prices/page.tsx:115` |
| POST | `${process.env.API_URL}/auth/exchange-code` | `nglobi/app/oauth/callback/page.tsx:22` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/oauth/callback/page.tsx:37` |
| PATCH | `${process.env.API_URL}/users/me` | `nglobi/app/oauth/callback/page.tsx:77` |
| POST | `${backendUrl}/driver/upload-file` | `nglobi/app/actions/upload.ts:44` |
| POST | `${process.env.API_URL}/auth/logout` | `nglobi/app/components/SharedNavbar.tsx:76` |
| POST | `${process.env.API_URL}/auth/register` | `nglobi/app/business/register/page.tsx:26` |
| POST | `${process.env.API_URL}/auth/login` | `nglobi/app/(auth)/login/page.tsx:26` |
| POST | `${process.env.API_URL}/auth/register` | `nglobi/app/(auth)/register/page.tsx:30` |
| POST | `${process.env.API_URL}/auth/reset-password` | `nglobi/app/(auth)/reset-password/page.tsx:22` |
| POST | `${process.env.API_URL}/auth/forgot-password` | `nglobi/app/(auth)/forgot-password/page.tsx:18` |
| GET (inferred) | `${API}/admin/stats` | `nglobi/app/admin/page.tsx:49` |
| GET (inferred) | `${API}/admin/bookings` | `nglobi/app/admin/page.tsx:50` |
| GET (inferred) | `${API}/users/me` | `nglobi/app/admin/layout.tsx:98` |
| POST | `${API}/auth/logout` | `nglobi/app/admin/layout.tsx:123` |
| GET (inferred) | `${API}/admin/drivers` | `nglobi/app/admin/drivers/page.tsx:34` |
| PATCH | `${API}/admin/drivers/${id}/status` | `nglobi/app/admin/drivers/page.tsx:49` |
| GET (inferred) | `${API}/admin/bookings` | `nglobi/app/admin/bookings/page.tsx:38` |
| GET (inferred) | `${process.env.API_URL}/admin/bookings/${id}` | `nglobi/app/admin/bookings/[id]/page.tsx:43` |
| GET (inferred) | `${API}/admin/manager-applications` | `nglobi/app/admin/managers/page.tsx:52` |
| GET (inferred) | `${API}/admin/managers` | `nglobi/app/admin/managers/page.tsx:53` |
| PATCH | `${API}/admin/manager-applications/${approving.id}/approve` | `nglobi/app/admin/managers/page.tsx:70` |
| PATCH | `${API}/admin/manager-applications/${id}/reject` | `nglobi/app/admin/managers/page.tsx:84` |
| DELETE | `${API}/admin/managers/${id}` | `nglobi/app/admin/managers/page.tsx:97` |
| POST | `${API}/admin/managers` | `nglobi/app/admin/managers/page.tsx:107` |
| GET (inferred) | `${API}/pricing/settings` | `nglobi/app/admin/prices/page.tsx:27` |
| PUT | `${API}/pricing/settings` | `nglobi/app/admin/prices/page.tsx:46` |
| GET (inferred) | `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1` | `nglobi/app/app/page.tsx:152` |
| POST | `${process.env.API_URL}/promo/validate` | `nglobi/app/app/page.tsx:1823` |
| POST | `${process.env.API_URL}/pricing/calculate` | `nglobi/app/app/page.tsx:2559` |
| POST | `${process.env.API_URL}/bookings` | `nglobi/app/app/page.tsx:2643` |
| POST | `${process.env.API_URL}/payments/intent` | `nglobi/app/app/page.tsx:2693` |
| GET (inferred) | `${process.env.API_URL}/users/me/bonuses` | `nglobi/app/app/bonuses/page.tsx:26` |
| GET (inferred) | `${process.env.API_URL}/notifications/unread` | `nglobi/app/app/bonuses/page.tsx:29` |
| GET (inferred) | `${process.env.API_URL}/invoices/me` | `nglobi/app/app/invoices/page.tsx:23` |
| POST | `${process.env.API_URL}/invoices/${invoiceId}/pay` | `nglobi/app/app/invoices/page.tsx:44` |
| POST | `${process.env.API_URL}/quotes/draft` | `nglobi/app/app/book/page.tsx:687` |
| GET (inferred) | `${process.env.API_URL}/quotes/drafts/${draftId}` | `nglobi/app/app/book/page.tsx:997` |
| POST | `${process.env.API_URL}/pricing/calculate` | `nglobi/app/app/book/page.tsx:1056` |
| POST | `${process.env.API_URL}/bookings` | `nglobi/app/app/book/page.tsx:1126` |
| POST | `${process.env.API_URL}/payments/intent` | `nglobi/app/app/book/page.tsx:1169` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/profile/page.tsx:26` |
| PATCH | `${process.env.API_URL}/users/me` | `nglobi/app/app/profile/page.tsx:52` |
| GET (inferred) | `${API}/payments/booking/${bookingId}/status` | `nglobi/app/app/confirmation/page.tsx:38` |
| GET (inferred) | `${API}/bookings/${id}` | `nglobi/app/app/confirmation/page.tsx:56` |
| GET (inferred) | `${process.env.API_URL}/bookings/my-bookings` | `nglobi/app/app/approvals/page.tsx:37` |
| GET (inferred) | `${process.env.API_URL}/approval/bookings/${b.id}/pending-items` | `nglobi/app/app/approvals/page.tsx:49` |
| PATCH | `${process.env.API_URL}/approval/bookings/${bookingId}/items/${itemId}/${decision}` | `nglobi/app/app/approvals/page.tsx:82` |
| GET (inferred) | `${process.env.API_URL}/quotes/draft` | `nglobi/app/app/my-quotes/page.tsx:29` |
| GET (inferred) | `${process.env.API_URL}/quotes/draft/${id}` | `nglobi/app/app/my-quotes/page.tsx:49` |
| DELETE | `${process.env.API_URL}/quotes/draft/${id}` | `nglobi/app/app/my-quotes/page.tsx:67` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/page.tsx:134` |
| GET (inferred) | `${process.env.API_URL}/bookings` | `nglobi/app/app/dashboard/page.tsx:137` |
| GET (inferred) | `${process.env.API_URL}/storage` | `nglobi/app/app/dashboard/page.tsx:140` |
| GET (inferred) | `${process.env.API_URL}/notifications/unread` | `nglobi/app/app/dashboard/page.tsx:143` |
| PATCH | `${process.env.API_URL}/notifications/read-all` | `nglobi/app/app/dashboard/page.tsx:194` |
| POST | `${process.env.API_URL}/storage` | `nglobi/app/app/dashboard/page.tsx:210` |
| POST | `${process.env.API_URL}/payments/intent` | `nglobi/app/app/dashboard/page.tsx:677` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/account/page.tsx:29` |
| PATCH | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/account/page.tsx:54` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/storage/page.tsx:65` |
| GET (inferred) | `${process.env.API_URL}/storage` | `nglobi/app/app/dashboard/storage/page.tsx:68` |
| POST | `${process.env.API_URL}/storage/${activeStorage.id}/delivery` | `nglobi/app/app/dashboard/storage/page.tsx:131` |
| GET (inferred) | `${process.env.API_URL}/storage` | `nglobi/app/app/dashboard/storage/page.tsx:155` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/orders/page.tsx:85` |
| GET (inferred) | `${process.env.API_URL}/bookings` | `nglobi/app/app/dashboard/orders/page.tsx:88` |
| GET (inferred) | `${process.env.API_URL}/notifications/unread` | `nglobi/app/app/dashboard/orders/page.tsx:91` |
| GET (inferred) | `${process.env.API_URL}/bookings` | `nglobi/app/app/dashboard/orders/page.tsx:177` |
| PATCH | `${process.env.API_URL}/notifications/read-all` | `nglobi/app/app/dashboard/orders/page.tsx:187` |
| POST | `${process.env.API_URL}/storage` | `nglobi/app/app/dashboard/orders/page.tsx:205` |
| PATCH | `${process.env.API_URL}/bookings/${selectedBooking.id}/items` | `nglobi/app/app/dashboard/orders/page.tsx:226` |
| PATCH | `${process.env.API_URL}/bookings/${selectedBooking.id}/reschedule` | `nglobi/app/app/dashboard/orders/page.tsx:263` |
| POST | `${process.env.API_URL}/payments/intent` | `nglobi/app/app/dashboard/orders/page.tsx:835` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/app/dashboard/rewards/page.tsx:45` |
| GET (inferred) | `${process.env.API_URL}/users/me/bonuses` | `nglobi/app/app/dashboard/rewards/page.tsx:48` |
| POST | `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}` | `nglobi/app/api/ai-assistant/route.ts:95` |
| GET (inferred) | `${process.env.API_URL}/users/me/bonuses` | `nglobi/app/partner/dashboard/page.tsx:38` |
| GET (inferred) | `${process.env.API_URL}/notifications/unread` | `nglobi/app/partner/dashboard/page.tsx:39` |
| GET (inferred) | `${process.env.API_URL}/users/me` | `nglobi/app/partner/dashboard/page.tsx:40` |
| GET (inferred) | `${process.env.API_URL}/users/me/withdrawals` | `nglobi/app/partner/dashboard/page.tsx:41` |
| POST | `${process.env.API_URL}/users/me/withdraw` | `nglobi/app/partner/dashboard/page.tsx:92` |
| PATCH | `${process.env.API_URL}/users/me` | `nglobi/app/partner/dashboard/page.tsx:123` |
| POST | `${API}/auth/register` | `nglobi/app/become-driver/DriverApplyForm.tsx:36` |
| GET (inferred) | `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1` | `nglobi/components/RouteMap.tsx:42` |
| GET (inferred) | `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson` | `nglobi/components/RouteMap.tsx:56` |
| GET (inferred) | `${process.env.API_URL}/notifications/unread` | `nglobi/components/NotificationsDropdown.tsx:34` |
| PATCH | `${process.env.API_URL}/notifications/read-all` | `nglobi/components/NotificationsDropdown.tsx:49` |
| POST | `${process.env.API_URL}/auth/logout` | `nglobi/components/nglob-shared.tsx:107` |
| GET (inferred) | `${process.env.API_URL}/bookings` | `nglobi/components/nglob-pages-account.tsx:40` |
| GET (inferred) | `${process.env.API_URL}/storage` | `nglobi/components/nglob-pages-account.tsx:43` |
| GET (inferred) | `${process.env.API_URL}/bookings/${id}` | `nglobi/components/nglob-pages-account.tsx:257` |
| PATCH | `${process.env.API_URL}/bookings/${id}/addresses` | `nglobi/components/nglob-pages-account.tsx:279` |
| PATCH | `${process.env.API_URL}/bookings/${id}/cancel` | `nglobi/components/nglob-pages-account.tsx:318` |
| GET (inferred) | `${process.env.API_URL}/storage/${id}` | `nglobi/components/nglob-pages-account.tsx:829` |
| POST | `${process.env.API_URL}/bookings/${bookingId}/invoice` | `nglobi/components/nglob-missing-1-5.tsx:224` |
| POST | `${process.env.API_URL}${endpoint}` | `nglobi/components/nglob-missing-1-5.tsx:422` |
| POST | `${process.env.API_URL}/auth/login` | `nglobi/components/nglob-missing-1-5.tsx:632` |
| POST | `${process.env.API_URL}/driver/upload-file` | `nglobi/components/booking/AddItemsModal.tsx:350` |
| GET (inferred) | `https://nominatim.openstreetmap.org/search?${params}` | `nglobi/components/booking/AddressAutocomplete.tsx:165` |
| POST | `${process.env.API_URL}${endpoint}` | `nglobi/components/booking/AuthModal.tsx:41` |
| POST | `/api/ai-assistant` | `nglobi/components/booking/AIAssistantPanel.tsx:292` |
| GET (inferred) | `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupStr)}` | `nglobi/components/booking/MapPreview.tsx:66` |
| GET (inferred) | `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationStr)}` | `nglobi/components/booking/MapPreview.tsx:86` |
| POST | `/api/ai-vision/detect` | `nglobi/lib/ai-vision.ts:91` |
| POST | `${API}/auth/refresh` | `nglobi/lib/auth-token.ts:109` |
| GET (inferred) | `${API}${path}` | `nglobi/lib/auth-token.ts:152` |
| GET (inferred) | `${API}/bookings/${bookingId}/tracking` | `nglobi/hooks/useBookingTracking.ts:35` |
| GET (inferred) | `${process.env.API_URL}/pricing/settings` | `nglobi/hooks/usePrices.ts:66` |
