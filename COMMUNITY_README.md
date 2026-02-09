# 🚲 Kandie Gang Event System: Roadmap

Welcome to the Kandie Gang Event Manager. This system bridges **Headless WordPress** (Content) with **Supabase** (Live Data) to create a seamless registration experience for our rides and workshops.

## 🚀 What's Next?

To evolve this from a data-fetcher into a fully functional registration system, we are focusing on the following three pillars:

---

### 1. The Signup Bridge 🌉
We need to link our WordPress content with our user registrations.
* **The Task:** Create a `registrations` table in Supabase.
* **Key Identifier:** Use the `databaseId` fetched from the GraphQL query as the `event_id` in Supabase.
* **Data Structure:**
    * `event_id` (int): Links to WordPress ID.
    * `user_id` (uuid): Links to Supabase Auth.
    * `ride_level` (text): Tracks if they joined level1, level2, level2plus, or level3.
    * `event_type` (text): Tracks if it's a 'groupride' or 'workshop'.

### 2. The Spot Counter 🔢
Real-time capacity management to ensure we don't overbook.
* **The Logic:**
    * **Workshops:** Subtract current Supabase registrations from the `workshopCapacity` field.
    * **Rides:** Each guide allows for exactly **7 participants**. 
* **Formula:** `Spots Available = (Number of Guides × 7) - (Current Signups for that Level)`
* **UI Hint:** The signup button should automatically disable and show "Sold Out" when this hits zero.

### 3. FLINTA* Phasing & Logic 🏳️‍🌈
Maintaining our community values through smart registration windows.
* **FLINTA* Only Entirely:** If `isFlintaOnly` is true, the frontend must restrict signups to FLINTA* identifying members only.
* **Phased Release:** * Check `publicReleaseDate`.
    * If current time < `publicReleaseDate`, only priority members (FLINTA*) can see the signup button.
    * If current time > `publicReleaseDate`, the button becomes visible to the general public.

## 🛠 Technical Structure

- **Types:** Definitions for WordPress/GraphQL data are located in `src/types/events.ts`.
- **Components:** The main event detail view is `src/components/KandieEventPage.tsx`.
- **Logic:** - Spots are calculated as `guideCount * 7`.
  - Registration locks are based on the `publicReleaseDate` field.

## 🛠 Tech Stack
* **CMS:** WordPress + ACF + WPGraphQL
* **Database/Auth:** Supabase
* **Frontend:** React (Headless)
* **Query Language:** GraphQL

---
*Keep the wheels spinning and the community winning.*