---
title: Mission Control
description: Your product's vital signs — volume, engagement, acquisition, and stickiness in one view
---

Mission Control is the home page of stratif.io. It gives you a single-screen overview of the health of your product across four dimensions: how much activity is happening, how engaged users are, whether you're acquiring new users, and how sticky the product is.

![Mission Control dashboard showing all metrics and the top events list](/screenshots/mc-dark.png)

Open it every morning before anything else. If something has changed significantly overnight, you'll see it here before you get the Slack message.

---

## Volume

### Total Events

The raw count of all events fired in the selected time window. Every user action your product tracks — page views, clicks, form submissions, purchases — adds to this number.

**Why it matters:** Total events is the heartbeat of your product. A sudden drop often means a tracking bug, a deployment regression, or a major user exodus. A sudden spike might mean a viral moment, a bot attack, or a successful campaign. Watch the trend line, not just the absolute number.

### Unique Users

The count of distinct `user_id` values in your events table for the period. This is your Monthly Active Users (MAU) when the date range spans a full month.

**Why it matters:** Total events can grow because existing users are doing more — or because you have more users. These are very different situations. When Total Events grows but Unique Users stays flat, your existing users are more active. When both grow together, you're acquiring and retaining. Unique Users separates volume from growth.

### Weekly Active Users (WAU)

Distinct users who fired at least one event in the last 7 days of the selected period.

**Why it matters:** WAU sits between the sensitivity of DAU and the smoothness of MAU. It catches weekly-cycle products (tools people use on weekdays but not weekends) better than monthly figures, and it's less noisy than daily counts. Tracking WAU alongside MAU tells you whether engagement is concentrated in a few weeks or distributed across the month.

---

## Engagement

### Sessions

A session is a group of events from the same user with no gap longer than 30 minutes. Sessions represent meaningful visits — a user opening the product, doing things, and leaving.

**Why it matters:** Sessions tell you how often users come back and how long they stay engaged in a single sitting. A product with high unique users but low sessions per user is being opened and immediately abandoned. Sessions per user is a proxy for habit formation.

### Avg Session Duration

The average length of a session in minutes and seconds, measured from the first event to the last event within a session window.

**Why it matters:** Duration is a double-edged signal. For content products, long sessions are good — users are reading, watching, exploring. For task-completion products (e-commerce checkout, form filing), long sessions can mean confusion or friction. Know which type your product is before interpreting this number.

### Events / Session

The average number of events fired within a single session.

**Why it matters:** Events per session is a measure of depth. Users who trigger many events in a session are exploring, using multiple features, or completing complex workflows. A low events-per-session number combined with short duration is a strong signal of shallow engagement — users land, look at one thing, and leave. Increasing events per session is often a more actionable goal than increasing session duration.

### Active Days

The average number of distinct calendar days a user was active during the selected period.

**Why it matters:** Active days measures visit frequency per user — not whether they came back (that's Returning Users) but how often. A user active 15 out of 30 days is deeply habituated. A user active 2 out of 30 days may have returned once after a long gap. Low average active days alongside healthy Unique Users can mean users try and then slow down — an early signal of disengagement before it shows up in churn.

### Power Users

The count of users who exceed an activity threshold — by default, users active on more days than the median for the period. The threshold adapts to your date range.

**Why it matters:** Power users disproportionately drive retention, word-of-mouth, and upsell revenue. Tracking this cohort size tells you whether your most engaged users are growing or shrinking as a share of your total base. A product where power users are a declining fraction of MAU is losing depth even as the headline user count stays flat.

---

## Acquisition

### New Users

Users who appear in your events table for the first time within the selected date range — their earliest event falls within the window.

**Why it matters:** New users is your growth input. If this number is declining, your top-of-funnel is shrinking. If it's growing but retention is flat, you have a leaky bucket problem — you're filling the tub while the drain is open.

### Returning Users

Users whose first event predates the selected window but who fired at least one event within it, and who were also active in the previous period (not resurrected).

**Why it matters:** Returning users is your retention output. A healthy product has a growing returning-user base. Compare New vs Returning over time: a ratio shifting toward returning means your product is building habits and loyalty. A ratio shifting toward new means you're dependent on acquisition to replace users who stop coming back.

### Resurrected Users

Users who had been inactive long enough to be considered churned — no activity for longer than the resurrection window — but who returned during the selected period.

**Why it matters:** Resurrections are a leading indicator of re-engagement campaign effectiveness. If you run a win-back email and Resurrected goes up next week, it worked. Resurrected users often have lower long-term retention than continuously active users, so track whether they stick around after resurrection or churn again quickly.

### Churned Users

Users who were active in the previous equivalent period but fired no events in the current period.

**Why it matters:** Churn is the denominator that erodes everything else. If New Users = 500 and Churned Users = 480, you're on a treadmill — growing the user base by only 20 net users per period despite significant acquisition. Watch the ratio of Churned to New over time. When churn starts approaching new acquisition, growth stalls.

### Retention Rate

The percentage of last period's active users who also fired an event in the current period: `retained_users / prev_unique_users × 100`.

**Why it matters:** Retention Rate is the single most predictive metric for long-term product health. It answers: "Of the users I had, how many came back?" A product with 70%+ monthly retention is compounding — each cohort mostly stays. Below 20%, the product has a fundamental engagement problem that acquisition cannot fix. The tooltip shows the raw numbers (`retained / previous`) so you can see the exact cohort being measured.

---

## Stickiness

### DAU / MAU

Daily Active Users divided by Monthly Active Users, expressed as a percentage. A user is "active" in a period if they fired at least one event.

**Why it matters:** DAU/MAU measures habit strength. A 100% ratio would mean every monthly user comes back every single day — impossible in practice. Real benchmarks:

- **<5%**: Users rarely return within the month. Low habit product or niche tool.
- **10–20%**: Typical for weekly-use products (project management, analytics).
- **20–50%**: Strong engagement. Users return multiple times per week.
- **>50%**: Daily habit product (messaging, social media, daily dashboards).

stratif.io's own benchmark for a healthy internal analytics tool is 20–30% DAU/MAU.

---

## Top Events

The ranked list of the most frequently fired events in the period. Each row shows the event name and its total count.

**Why it matters:** Top Events tells you what users are actually doing, not what you designed them to do. If `Search` appears five times more than `Purchase`, users are searching but not converting. If an event you thought was rare appears in the top 3, something unexpected is happening in your product. This list is a fast gut-check on user behaviour.

---

## Customise metrics

Click **Customize metrics** at the bottom of the Volume/Engagement panel to add or remove metric cards. You can surface any aggregate across your events table — total revenue, error counts, specific event frequencies — as a first-class metric on this screen.

## View the SQL

Every metric and chart on this page has a **SQL** badge. Click it to open the exact query stratif.io ran against your warehouse to produce that number — joins, window functions, filters and all.

![SQL viewer button on a chart](/screenshots/sql-viewer.png)

You can copy the query into [SQL Studio](/features/sql-studio/) to modify it, run variations, or use it as a starting point for your own analysis. This makes stratif.io a learning tool as much as an analytics tool: you can see how product metrics are actually computed in SQL, not just consume the results.
