import { Response, Request } from 'express';

// models
import Project from '../../../../models/projects.model';
import Account from '../../../../models/accounts.model';
import User from '../../../../models/users.model';

// helpers
import { pagination } from '../../../../helpers/pagination';

export const controller = {
  // [GET] /admin/api/v1/projects/dropdowns
  dropdowns: async (req: Request, res: Response) => {
    // dùng làm bảng chọn người dùng lọc thông tin người dùng req.query bên dưới project index
    try {
      if (!req.role.permissions.includes('projects_view')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const users = await User.find({ deleted: false, status: 'active' })
        .lean()
        .select('_id fullName');

      const accounts = await Account.find({
        deleted: false,
        status: 'active',
        _id: { $ne: req.account._id },
      })
        .lean()
        .select('_id fullName');

      const data = [...users, ...accounts];
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /admin/api/v1/projects
  index: (route: string) => {
    return async (req: Request, res: Response) => {
      try {
        if (!req.role.permissions.includes('projects_view')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập',
          });
        }
        const filter: any = {
          deleted: route === 'trash' ? true : false,
        };

        // filter by status, userCreatedBy, deadline
        const { status, createdById, from, to } = req.query;
        if (status) filter.status = status;
        if (createdById) filter['createdBy.createdById'] = createdById;
        if (from && to) filter.deadline = { $gte: from, $lte: to };

        // search
        if (req.query.keyword) {
          const regex = new RegExp(req.query.keyword as string, 'i');
          filter.$or = [{ title: regex }, { description: regex }];
        }

        // sort
        const sort: any = {
          title: 'desc',
        };
        if (req.query.sort_key && req.query.sort_value) {
          sort[req.query.sort_key as string] = req.query.sort_value;
        }

        // pagination
        const totalProjects = await Project.countDocuments(filter);
        const helperPagination = pagination(
          {
            page: 1,
            limit: 4,
          },
          totalProjects,
          req.query
        );

        const projects: any = await Project.find(filter)
          .lean()
          .sort(sort)
          .skip(helperPagination.skip)
          .limit(helperPagination.limit);

        if (route === 'trash') {
          for (const project of projects) {
            const account = await Account.findOne({
              _id: project.deletedBy.deletedById,
              deleted: false,
            })
              .lean()
              .select('fullName');

            // get full name deleted by
            project.deletedBy.fullName = account ? account.fullName : 'không';
          }
        } else {
          for (const project of projects) {
            const account = await Account.findOne({
              _id: project.createdBy.createdById,
              deleted: false,
            })
              .lean()
              .select('fullName');

            // get full name created by
            project.createdBy.fullName = account ? account.fullName : 'không';

            // get full name updated by
            if (project.updatedBy.length > 0) {
              const lastUpdated =
                project.updatedBy[project.updatedBy.length - 1];
              const userUpdated = await Account.findOne({
                _id: lastUpdated.updatedById,
                deleted: false,
              })
                .lean()
                .select('fullName');

              lastUpdated.fullName = userUpdated
                ? userUpdated.fullName
                : 'không';
            }
          }
        }

        res.status(200).json({
          success: true,
          data: projects,
          pagination: helperPagination,
          totalProjects,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Lỗi server',
        });
      }
    };
  },

  // [GET] /admin/api/v1/projects/detail/:id
  detail: (route: string) => {
    return async (req: Request, res: Response) => {
      try {
        if (!req.role.permissions.includes('projects_view')) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập',
          });
        }
        const project: any = await Project.findOne({
          _id: req.params.id,
          deleted: route === 'trash' ? true : false,
        }).lean();

        if (!project) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy project',
          });
        }

        if (route === 'trash') {
          const account = await Account.findOne({
            _id: project.deletedBy.deletedById,
            deleted: false,
          })
            .lean()
            .select('fullName');

          // get full name deleted by
          project.deletedBy.fullName = account ? account.fullName : 'không';
        } else {
          const account = await Account.findOne({
            _id: project.createdBy.createdById,
            deleted: false,
          })
            .lean()
            .select('fullName');

          // get full name created by
          project.createdBy.fullName = account ? account.fullName : 'không';

          // get full name updated by
          if (project.updatedBy.length > 0) {
            for (const updated of project.updatedBy) {
              const userUpdated = await Account.findOne({
                _id: updated.updatedById,
                deleted: false,
              })
                .lean()
                .select('fullName');

              // get full name updated by
              updated.fullName = userUpdated ? userUpdated.fullName : 'không';
            }
          }
        }

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
    };
  },

  // [POST] /admin/api/v1/projects/create
  create: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_create')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      req.body.createdBy = {
        createdById: req.account._id,
      };
      const newProject = new Project(req.body);
      await newProject.save();

      res.status(201).json({
        success: true,
        message: 'Project tạo thành công',
        data: newProject,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/projects/edit/:id
  edit: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const project = await Project.findOne({
        _id: id,
        deleted: false,
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Dự án không tìm thấy',
        });
      }
      const updatedBy = {
        updatedById: req.account._id,
        title: 'Cập nhật thông tin dự án',
        updatedAt: Date.now(),
      };
      await Project.updateOne(
        { _id: id },
        {
          ...req.body,
          $push: { updatedBy: updatedBy },
        }
      );
      res.status(200).json({
        success: true,
        message: 'Dự án cập nhật thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [DELETE] /admin/api/v1/projects/delete/:id
  delete: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_delete')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const project = await Project.findOne({
        _id: id,
        deleted: false,
      });
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Dự án không tìm thấy',
        });
      }

      const deletedBy = {
        deletedById: req.account._id,
        deletedAt: Date.now(),
      };
      await Project.updateOne(
        { _id: id },
        {
          deleted: true,
          deletedBy: deletedBy,
        }
      );
      res.status(200).json({
        success: true,
        message: 'Dự án xóa thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/projects/change-status/:id
  changeStatus: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const { status } = req.body;
      const project = await Project.findOne({
        _id: id,
        deleted: false,
      });
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'project không tìm thấy',
        });
      }

      const updatedBy = {
        updatedById: req.account._id,
        title: 'Cập nhật trạng thái dự án',
        updatedAt: Date.now(),
      };

      await Project.updateOne(
        { _id: id },
        {
          status: status,
          $push: { updatedBy: updatedBy },
        }
      );
      res.status(200).json({
        success: true,
        message: 'project cập nhật trạng thái thông',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/projects/change-multi
  // [PATCH] /admin/api/v1/projects/trash/change-multi
  changeMulti: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { ids, key, value } = req.body;
      let updatedBy: any;
      let updateValue: any;
      switch (key) {
        case 'deleted':
          updateValue = {
            [key]: value,
            deletedBy: {
              deletedById: req.account._id,
              deletedAt: new Date(),
            },
          };
          break;
        case 'status':
          updatedBy = {
            title: 'cập nhật trạng thái dự án',
            updatedById: req.account._id,
            updatedAt: new Date(),
          };
          updateValue = {
            [key]: value,
            $push: { updatedBy: updatedBy },
          };
          break;
        case 'restore':
          updatedBy = {
            title: 'khôi phục dự án',
            updatedById: req.account._id,
            updatedAt: new Date(),
          };
          updateValue = {
            deleted: value,
            $push: { updatedBy: updatedBy },
          };
          break;
        case 'deleted-permanently':
          await Project.deleteMany({ _id: { $in: ids }, deleted: true });
          return res.status(200).json({
            success: true,
            message: `Xóa vĩnh viễn ${ids.length} dự án thành công`,
          });
        default:
          break;
      }
      await Project.updateMany(
        {
          _id: { $in: ids },
          deleted: req.body.key === 'restore' ? true : false,
        },
        updateValue
      );
      return res.status(200).json({
        success: true,
        message: `${ids.length} Dự án cập nhật thành công`,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  //                                TRASH

  // [DELETE] /admin/api/v1/projects/trash/delete-permanently/:id
  deletePermanently: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_delete')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const project = await Project.findOne({
        _id: id,
        deleted: true,
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Dự án không tìm thấy',
        });
      }
      await Project.deleteOne({
        _id: id,
        deleted: true,
      });
      res.status(200).json({
        success: true,
        message: 'Dự án xóa thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/projects/trash/restore/:id
  restore: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('projects_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const project = await Project.findOne({
        _id: id,
        deleted: true,
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Dự án không tìm thấy',
        });
      }
      const updatedBy = {
        title: 'khôi phục dự án',
        updatedById: req.account._id,
        updatedAt: new Date(),
      };
      await Project.updateOne(
        { _id: id },
        {
          deleted: false,
          $push: { updatedBy: updatedBy },
        }
      );
      res.status(200).json({
        success: true,
        message: 'Dự án khôi phục thành công',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },
};
