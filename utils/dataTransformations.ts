export function bucketize(
  data: Array<{ lifetime_value: number }>,
  buckets: number[]
): Array<{ range: string; count: number }> {
  const result = [];
  for (let i = 0; i < buckets.length; i++) {
    const min = buckets[i];
    const max = buckets[i + 1] || Infinity;
    const count = data.filter((d) => d.lifetime_value >= min && d.lifetime_value < max).length;
    result.push({
      range: max === Infinity ? `€${min}+` : `€${min}-€${max}`,
      count,
    });
  }
  return result;
}

export function aggregateByMonth(
  data: Array<{ customer_since: string }>
): Array<{ month: string; count: number }> {
  // Group by YYYY-MM, cumulative count
  const sorted = data.sort(
    (a, b) => new Date(a.customer_since).getTime() - new Date(b.customer_since).getTime()
  );

  const monthCounts: Record<string, number> = {};
  let cumulative = 0;

  sorted.forEach((item) => {
    const month = item.customer_since.substring(0, 7); // YYYY-MM
    cumulative++;
    monthCounts[month] = cumulative;
  });

  return Object.entries(monthCounts).map(([month, count]) => ({ month, count }));
}

export function countByArea(
  data: Array<{ member_areas: string[] | null }>
): Array<{ area: string; count: number }> {
  const areaCounts: Record<string, number> = {};

  data.forEach((member) => {
    if (member.member_areas) {
      member.member_areas.forEach((area) => {
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
    }
  });

  return Object.entries(areaCounts)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);
}
