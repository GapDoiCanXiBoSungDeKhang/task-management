import Task from '../../../../models/tasks.model';
import Account from '../../../../models/accounts.model';
import User from '../../../../models/users.model';

export interface IChart {
  userId: string;
  fullName: string;
  initial: number;
  doing: number;
  finish: number;
  pending: number;
  notFinish: number; // chưa xong nhưng chưa chắc trễ
  late: number; // trễ deadline
  completionRate?: number;
}

export const chartTask = async (): Promise<IChart[]> => {
  const [accounts, users] = await Promise.all([
    Account.find({ deleted: false })
      .lean()
      .select('_id fullName'),
    User.find({ deleted: false })
      .lean()
      .select('_id fullName')
  ]);

  const performers = [
    ...accounts.map((a: any) => ({ id: a._id.toString(), fullName: a.fullName })),
    ...users.map((u: any) => ({ id: u._id.toString(), fullName: u.fullName })),
  ];

  const stats: IChart[] = [];

  for (const performer of performers) {
    const tasks: any = await Task.find({
      deleted: false,
      listUsers: performer.id,
    }).lean();

    const item: IChart = {
      userId: performer.id,
      fullName: performer.fullName,
      initial: 0,
      doing: 0,
      finish: 0,
      pending: 0,
      notFinish: 0,
      late: 0,
    };

    for (const task of tasks) {
      (item as any)[task.status] += 1;

      if (
        task.status !== 'finish' &&
        task.timeFinish &&
        task.timeFinish < Date.now()
      ) {
        item.late += 1;
      }
    }

    const total =
      item.initial + item.doing + item.finish + item.pending + item.notFinish;
    item.completionRate = total > 0 ? (item.finish / total) * 100 : 0;

    stats.push(item);
  }

  return stats;
};
