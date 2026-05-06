In the market badges tooltip, show closing/opening times in UTC instead of local market timezone.
Keep the countdown ("Closes in Xh Xm") as-is. Only change the time display in the second line:
From 13:30 to 20:00 UTC
Convert local market hours to UTC at runtime using Intl — do not hardcode UTC times.
