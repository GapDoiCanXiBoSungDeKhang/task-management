import { Request, Response } from 'express';

// models
import Project from '../../../../models/projects.model';
import Account from '../../../../models/accounts.model';
import User from '../../../../models/users.model';
import Task from '../../../../models/tasks.model';

// helper
import { pagination } from '../../../../helpers/pagination';

export const controller = {
  // [GET] /api/v1/projects
  index: async (req: Request, res: Response) => {
    const filter: any = {
      deleted: false,
      members: req.user._id,
    };

    // Filter by status
    const { status, deadline } = req.query;
    if (status) filter.status = status;
    if (deadline) filter.deadline = { $gte: deadline, $lte: deadline };

    // Sort by ...
    const sort: any = {
      title: 'desc',
    };
    if (req.query.sort_key && req.query.sort_value) {
      sort[req.query.sort_key as string] = req.query.sort_value as string;
    }

    // Pagination
    const totalProject = await Project.countDocuments(filter);
    const helperPagination = pagination(
      {
        page: 1,
        limit: 4,
      },
      totalProject,
      req.query
    );

    // search
    if (req.query.keyword) {
      const keyword = req.query.keyword as string;
      const regex = new RegExp(keyword, 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const projects: any = await Project.find(filter)
      .lean()
      .select('-updatedBy -deletedBy')
      .sort(sort)
      .skip(helperPagination.skip)
      .limit(helperPagination.limit);

    for (const project of projects) {
      const account = await Account.findOne({
        _id: project.createdBy?.createdById,
        deleted: false,
      })
        .lean()
        .select('fullName');

      project.createdBy.fullName = account
        ? account.fullName
        : 'không tìm thấy';
    }

    res.status(200).json({
      success: true,
      data: projects,
      pagination: helperPagination,
    });
  },

  // [GET] /api/v1/projects/detail/:id
  detail: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const project: any = await Project.findOne({
        _id: id,
        deleted: false,
      })
        .lean()
        .select('-updatedBy -deletedBy');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Dự án không tìm thấy',
        });
      }

      const account = await Account.findOne({
        _id: project.createdBy?.createdById,
        deleted: false,
      })
        .lean()
        .select('fullName');

      project.createdBy.fullName = account
        ? account.fullName
        : 'không tìm thấy';

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/projects/detail/:id/list-member
  listMember: async (req: Request, res: Response) => {
    try {
      const project: any = await Project.findOne({
        _id: req.params.id,
        deleted: false,
      })
        .lean()
        .select('members');

      if (project?.members.length > 0) {
        const accounts = await Account.find({
          _id: { $in: project.members },
          deleted: false,
        })
          .lean()
          .select('fullName');

        const users = await User.find({
          _id: { $in: project.members },
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

  // [GET] /api/v1/projects/detail/:id/list-tasks
  listTasks: async (req: Request, res: Response) => {
    try {
      const tasks: any = await Task.find({
        projectId: req.params.id,
        deleted: false,
      })
        .lean()
        .select('title status');

      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  }
};
