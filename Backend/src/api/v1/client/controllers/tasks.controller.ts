import { Request, Response } from 'express';

// models
import Task from '../../../../models/tasks.model';
import User from '../../../../models/users.model';
import Account from '../../../../models/accounts.model';

// helper
import { pagination } from '../../../../helpers/pagination';
import { getSubTask } from '../../../../helpers/subTasks';

export const controller = {
  // [GET] /api/v1/dropdowns/users
  dropdowns: async (req: Request, res: Response) => {
    // create or edit insert listUser tasks
    const users = await User.find({ deleted: false })
      .lean()
      .select('_id fullName');

    const accounts = await Account.find({ deleted: false })
      .lean()
      .select('_id fullName');

    res.status(200).json({
      success: true,
      data: {
        users,
        accounts,
      },
    });
  },

  // [GET] /api/v1/tasks
  index: async (req: Request, res: Response) => {
    const filter: any = {
      deleted: false,
      $or: [{ createdBy: req.user._id }, { listUsers: req.user._id }],
    };
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Sort by ...
    const sort: any = {
      title: 'desc',
    };
    if (req.query.sort_key && req.query.sort_value) {
      sort[req.query.sort_key as string] = req.query.sort_value as string;
    }

    // Pagination
    const totalTasks = await Task.countDocuments(filter);
    const helperPagination = pagination(
      {
        page: 1,
        limit: 4,
      },
      totalTasks,
      req.query
    );

    // search
    const objectKeyword: any = {
      keyword: '',
    };
    if (req.query.keyword) {
      objectKeyword.keyword = req.query.keyword as string;
      filter.title = new RegExp(objectKeyword.keyword, 'i');
    }

    const tasks = await Task.find(filter)
      .sort(sort)
      .skip(helperPagination.skip)
      .limit(helperPagination.limit);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: helperPagination,
    });
  },

  // [GET] /api/v1/tasks/detail/:id
  detail: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task: any = await Task.findOne({
        _id: id,
        deleted: false,
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tìm thấy',
        });
      }

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/tasks/detail/:id/list-user
  listUsers: async (req: Request, res: Response) => {
    try {
      const task: any = await Task.findOne({
        _id: req.params.id,
        deleted: false,
      })
        .lean()
        .select('listUsers');

      if (task?.listUsers.length > 0) {
        const accounts = await Account.find({
          _id: { $in: task.listUsers },
          deleted: false,
        })
          .lean()
          .select('fullName');

        const users = await User.find({
          _id: { $in: task.listUsers },
          deleted: false,
        })
          .lean()
          .select('fullName');

        res.status(200).json({
          success: true,
          data: {
            admin: accounts,
            user: users,
          },
        });
      } else {
        return res.status(200).json({ 
          success: true, 
          data: { 
            admin: [], 
            user: [] 
          }  
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/tasks/detail/:id/subtasks
  subtasks: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task: any = await Task.findOne({
        _id: id,
        deleted: false,
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tìm thấy',
        });
      }

      const subtasks = await getSubTask(task.id);
      res.status(200).json({
        success: true,
        data: subtasks,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /api/v1/tasks/change-status/:id
  changeStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const task = await Task.findOne({ _id: id, deleted: false });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tìm thấy',
        });
      }

      await Task.updateOne({ _id: id }, { status: status });
      res.status(200).json({
        success: true,
        message: 'Task cập nhật trạng thái thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /api/v1/tasks/
  changeMultiStatus: async (req: Request, res: Response) => {
    try {
      // if key is deleted then object will be no key value so i will set value to true to mark as deleted
      if (req.body.key === 'deleted') {
        req.body.value = true;
      }
      const { ids, key, value } = req.body;
      await Task.updateMany(
        { _id: { $in: ids }, deleted: false },
        { [key]: value }
      );
      res.status(200).json({
        success: true,
        message: 'Task cập nhật trạng thái thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [POST] /api/v1/tasks/create
  create: async (req: Request, res: Response) => {
    try {
      req.body.createdBy = req.user._id;
      const newTask = new Task(req.body);
      await newTask.save();
      res.status(201).json({
        success: true,
        message: 'Task tạo thành công',
        data: newTask,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /api/v1/tasks/edit/:id
  edit: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, deleted: false });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tìm thấy',
        });
      }

      await Task.updateOne({ _id: id }, req.body);
      res.status(200).json({
        success: true,
        message: 'Task cập nhật thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [DELETE] /api/v1/tasks/delete/:id
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task = await Task.findOne({ _id: id, deleted: false });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task không tìm thấy',
        });
      }

      await Task.updateOne({ _id: id }, { deleted: true });
      res.status(200).json({
        success: true,
        message: 'Task xóa thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },
};
