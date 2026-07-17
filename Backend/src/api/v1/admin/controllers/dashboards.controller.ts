import { Request, Response } from 'express';

// models
import User from '../../../../models/users.model';
import Account from '../../../../models/accounts.model';
import Project from '../../../../models/projects.model';

// services
import { getProgress, countPerformers } from '../services/getProgress';
import { getDeadline } from '../services/getDeadline';
import { systemProgress } from '../services/systemProgress';
import { projectsProgress } from '../services/getProgressProjects';
import { chartTask } from '../services/getChartTasks';
import { getChartProjects } from '../services/getChartProjects';

// helpers
import { pagination } from '../../../../helpers/pagination';

export const controller = {
  // [GET] /api/v1/admin/dashboard/dropdowns
  dropdown: async (req: Request, res: Response) => {
    // dùng làm bảng chọn người dùng lọc thông tin người dùng req.query bên dưới progress dashboard
    try {
      const users = await User.find({
        status: 'active',
        deleted: false,
      })
        .lean()
        .select('_id fullName');
      const accounts = await Account.find({
        status: 'active',
        deleted: false,
      })
        .lean()
        .select('_id fullName');

      return res.status(200).json({
        success: true,
        data: {
          users,
          accounts,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/admin/dashboard/progress
  progress: async (req: Request, res: Response) => {
    try {
      const { userId }: any = req.query;

      // Filter ...
      const performerCondition: any = {};
      if (userId) performerCondition._id = userId;

      // Sort by ...
      const sort: any = {
        fullName: 1,
      };
      if (req.query.sort_key && req.query.sort_value) {
        sort[req.query.sort_key as string] = req.query.sort_value as string;
      }

      const totalPerformers = await countPerformers(performerCondition);
      const helperPagination = pagination(
        {
          page: 1,
          limit: 4,
        },
        totalPerformers,
        req.query
      );

      const progress = await getProgress(
        performerCondition,
        sort,
        helperPagination
      );

      // Deadline
      const deadline = await getDeadline();

      res.status(200).json({
        success: true,
        data: progress,
        pagination: helperPagination,
        deadline,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/admin/dashboard/projects-progress
  projectsProgress: async (req: Request, res: Response) => {
    try {
      const { status, from, to, keyword }: any = req.query;

      const condition: any = {
        deleted: false,
      };

      // Filter by status, deadline
      if (status) condition.status = status;
      if (from && to) condition.deadline = { $gte: from, $lte: to };

      // Filter by keyword
      if (keyword) {
        const regex = new RegExp(keyword, 'i');
        condition.$or = [{ title: regex }, { description: regex }];
      }

      // Sort by ...
      const sort: any = {
        title: 'desc',
      };
      if (req.query.sort_key && req.query.sort_value) {
        sort[req.query.sort_key as string] = req.query.sort_value as string;
      }

      const totalTasks = await Project.countDocuments(condition);
      const helperPagination = pagination(
        {
          page: 1,
          limit: 4,
        },
        totalTasks,
        req.query
      );

      const progress = await projectsProgress(
        condition,
        sort,
        helperPagination
      );

      res.status(200).json({
        success: true,
        data: progress,
        pagination: helperPagination,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/admin/dashboard/chart
  chart: async (req: Request, res: Response) => {
    try {
      const chart = await chartTask();
      const chartProject = await getChartProjects();
      return res.status(200).json({
        success: true,
        chartTask: chart,
        chartProject,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /api/v1/admin/dashboard/system
  system: async (req: Request, res: Response) => {
    try {
      const system = await systemProgress();
      return res.status(200).json({
        success: true,
        data: system,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },
};