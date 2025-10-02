
export async function checkUpcomingFollowups() {
  // TODO: query prisma.followUp where followupDate is today or overdue
  return [] as any[];
}

export async function getUpcomingFollowups(userId: string) {
  // TODO: scope by user/team and sort by priority/time
  void userId;
  return [] as any[];
}
