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

The count of distinct `user_id` values in your events table for the period.

**Why it matters:** Total events can grow because existing users are doing more — or because you have more users. These are very different situations. When Total Events grows but Unique Users stays flat, your existing users are more active. When both grow together, you're acquiring and retaining. Unique Users separates volume from growth.

---

## Engagement

### Sessions

A session is a group of events from the same user with no gap longer than 30 minutes. Sessions represent meaningful visits — a user opening the product, doing things, and leaving.

**Why it matters:** Sessions tell you how often users come back and how long they stay engaged in a single sitting. A product with high unique users but low sessions per user is being opened and immediately abandoned. Sessions per user is a proxy for habit formation.

### Avg Session Duration

The average length of a session in minutes and seconds, measured from the first event to the last event within a session window.

**Why it matters:** Duration is a double-edged signal. For content products, long sessions are good — users are reading, watching, exploring. For task-completion products (e-commerce checkout, form filing), long sessions can mean confusion or friction. Know which type your product is before interpreting this number.

---

## Acquisition

### New Users

Users who appear in your events table for the first time within the selected date range — their earliest event falls within the window.

**Why it matters:** New users is your growth input. If this number is declining, your top-of-funnel is shrinking. If it's growing but retention is flat, you have a leaky bucket problem — you're filling the tub while the drain is open.

### Returning Users

Users whose first event predates the selected window but who fired at least one event within it.

**Why it matters:** Returning users is your retention output. A healthy product has a growing returning-user base. Compare New vs Returning over time: a ratio shifting toward returning means your product is building habits and loyalty. A ratio shifting toward new means you're dependent on acquisition to replace users who stop coming back.

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
