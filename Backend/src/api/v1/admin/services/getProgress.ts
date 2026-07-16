import Task from '../../../../models/tasks.model';
import Account from '../../../../models/accounts.model';
import User from '../../../../models/users.model';

export interface IProgress {
  userId: string;
  initial: number;
  doing: number;
  finish: number;
  pending: number;
  notFinish: number;
  completionRate?: number;
  createdBy?: {
    fullName: string;
    role?: string;
    phone?: string;
    email?: string;
  };
}

// Đếm tổng số performer (account + user) khớp điều kiện — dùng để tính pagination
// ở mức USER, giống cách Project.countDocuments() dùng cho projectsProgress.
export const countPerformers = async (
  performerCondition: any = {}
): Promise<number> => {
  const [totalAccounts, totalUsers] = await Promise.all([
    Account.countDocuments({ deleted: false, ...performerCondition }),
    User.countDocuments({ deleted: false, ...performerCondition })
  ]);
  return totalAccounts + totalUsers;
};

export const getProgress = async (
  taskCondition: any = {},
  performerCondition: any = {},
  sort: any = { fullName: 1 },
  pagination: any = { skip: 0, limit: 100 }
): Promise<IProgress[]> => {
  
  // Lấy toàn bộ người có thể tham gia task (admin + user), giống cách lấy
  // toàn bộ Project ở projectsProgress, thay vì dò theo createdBy.
  // Thực hiện truy vấn song song bằng Promise.all kết hợp sắp xếp từ Database.
  const [accounts, users] = await Promise.all([
    Account.find({ deleted: false, ...performerCondition })
      .sort(sort)
      .lean()
      .select('_id fullName email phone'),
    User.find({ deleted: false, ...performerCondition })
      .sort(sort)
      .lean()
      .select('_id fullName email phone')
  ]);

  const performers = [
    ...accounts.map((a: any) => ({ ...a, role: 'admin' })),
    ...users.map((u: any) => ({ ...u, role: 'user' })),
  ];

  // Sort + phân trang ở mức USER (không phải mức Task) — sửa đúng lỗi cũ khiến
  // 1 trang chỉ hiện được 1 người dùng do phân trang nhầm theo Task.
  const paginated = performers.slice(
    pagination.skip,
    pagination.skip + pagination.limit
  );

  const stats: IProgress[] = [];

  // N+1 query chấp nhận được: với mỗi performer trong trang hiện tại, truy vấn
  // task mà họ có trong listUsers (bao gồm cả người tạo, vì khi tạo task luôn
  // được thêm vào listUsers).
  for (const performer of paginated) {
    const tasks: any = await Task.find({
      deleted: false,
      listUsers: performer._id.toString(),
      ...taskCondition,
    }).lean();

    const item: IProgress = {
      userId: performer._id.toString(),
      initial: 0,
      doing: 0,
      finish: 0,
      pending: 0,
      notFinish: 0,
      createdBy: {
        fullName: performer.fullName,
        role: performer.role,
        phone: performer.phone,
        email: performer.email,
      },
    };

    for (const task of tasks) {
      if (item.hasOwnProperty(task.status)) {
        (item as any)[task.status] += 1;
      }

      if (task.status === 'notFinish') continue;

      if (
        task.status !== 'finish' &&
        task.timeFinish &&
        new Date(task.timeFinish) < new Date()
      ) {
        item.notFinish += 1;
      }
    }

    const total =
      item.initial + item.doing + item.finish + item.pending + item.notFinish;
    item.completionRate = total > 0 ? (item.finish / total) * 100 : 0;

    stats.push(item);
  }

  return stats;
};