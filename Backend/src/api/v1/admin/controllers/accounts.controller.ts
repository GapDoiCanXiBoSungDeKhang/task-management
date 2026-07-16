import Account from '../../../../models/accounts.model';
import Role from '../../../../models/roles.model';

import { Response, Request } from 'express';
import bcrypt from 'bcrypt';

// helpers
import { pagination } from '../../../../helpers/pagination';

export const controller = {
  // [GET] /admin/api/v1/accounts
  index: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_view')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const filter: any = {
        deleted: false,
      };

      // filter
      if (req.query.status) {
        filter.status = req.query.status;
      }

      // search
      if (req.query.keyword) {
        const keyword = req.query.keyword;
        const regex = new RegExp(keyword as string, 'i');
        filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
      }

      // pagination
      const totalAccounts = await Account.countDocuments(filter);
      const helperPagination = pagination(
        {
          page: 1,
          limit: 4,
        },
        totalAccounts,
        req.query
      );

      // sort
      const sort: any = {
        title: 'desc',
      };
      if (req.query.sort_key && req.query.sort_value) {
        sort[req.query.sort_key as string] = req.query.sort_value;
      }

      const accounts: any = await Account.find(filter)
        .select('-password -deletedBy')
        .lean()
        .sort(sort)
        .skip(helperPagination.skip)
        .limit(helperPagination.limit);

      for (const account of accounts) {
        // tạo tên nhóm quyền
        const role = await Role.findOne({
          _id: account.role_id,
          deleted: false,
        })
          .lean()
          .select('title');
        account.roleTitle = role?.title;

        // tạo tên người tạo
        const user = await Account.findOne({
          _id: account.createdBy.account_id,
          deleted: false,
        })
          .lean()
          .select('fullName');
        account.createdBy.accountFullName = user?.fullName;

        const lastUpdated = account.updatedBy[account.updatedBy.length - 1];
        if (lastUpdated) {
          const userUpdated = await Account.findOne({
            _id: lastUpdated.account_id,
            deleted: false,
          })
            .lean()
            .select('fullName');
          lastUpdated.accountFullName = userUpdated?.fullName;
        }
      }

      res.status(200).json({
        success: true,
        data: accounts,
        pagination: helperPagination,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [POST] /admin/api/v1/accounts/create
  create: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_create')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const user: any = await Account.findOne({
        email: req.body.email,
        deleted: false,
      });

      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại, vui lòng nhập email khác!',
        });
      }
      req.body.password = await bcrypt.hash(req.body.password, 10);
      delete req.body.confirmPassword;

      req.body.createdBy = {
        account_id: req.account._id,
      };

      const account = new Account(req.body);
      await account.save();

      res.status(201).json({
        success: true,
        message: 'Tài khoản đã được tạo',
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/accounts/edit/:id
  edit: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const account = await Account.findOne({ _id: id, deleted: false });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tìm thấy',
        });
      }
      const updatedBy = {
        account_id: req.account._id,
        title: 'Cập nhật tài khoản',
        updatedAt: new Date(),
      };

      await Account.updateOne(
        { _id: id },
        {
          ...req.body,
          $push: { updatedBy: updatedBy },
        }
      );
      res.status(200).json({
        success: true,
        message: 'Tài khoản đã được cập nhật',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [DELETE] /admin/api/v1/accounts/delete/:id
  delete: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_delete')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const account = await Account.findOne({ _id: id, deleted: false });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tìm thấy',
        });
      }
      const deletedBy = {
        account_id: req.account._id,
        deletedAt: new Date(),
      };
      await Account.updateOne(
        { _id: id },
        {
          deleted: true,
          deletedBy: deletedBy,
        }
      );
      res.status(200).json({
        success: true,
        message: 'Tài khoản đã được xóa',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [GET] /admin/api/v1/accounts/detail/:id
  detail: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_view')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const account: any = await Account.findOne({
        _id: id,
        deleted: false,
      })
        .lean()
        .select('-password');
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tìm thấy',
        });
      }

      // tạo tên người tạo
      const user = await Account.findOne({
        _id: account.createdBy.account_id,
        deleted: false,
      }).lean();
      account.createdBy.accountFullName = user?.fullName;

      // tạo tên người cập nhật
      for (const item of account.updatedBy) {
        const user = await Account.findOne({
          _id: item.account_id,
          deleted: false,
        }).lean();
        item.accountFullName = user?.fullName;
      }

      const role = await Role.findOne({
        _id: account.role_id,
        deleted: false,
      })
        .lean()
        .select('title permissions description');

      // gộp nhóm quyền với mô tả
      account.role = role;

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [DELETE] /admin/api/v1/accounts/change-status/:id
  changeStatus: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { id } = req.params;
      const { status } = req.body;
      const account = await Account.findOne({ _id: id, deleted: false });
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tìm thấy',
        });
      }
      const updatedBy = {
        account_id: req.account._id,
        title: 'thay đổi trạng tài khoản',
        updatedAt: new Date(),
      };
      await Account.updateOne(
        { _id: id },
        {
          status: status,
          $push: { updatedBy: updatedBy },
        }
      );
      res.status(200).json({
        success: true,
        message: 'Trạng thái đã được cập nhật',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },

  // [PATCH] /admin/api/v1/accounts/change-multi
  changeMulti: async (req: Request, res: Response) => {
    try {
      if (!req.role.permissions.includes('accounts_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập',
        });
      }
      const { ids, key, value } = req.body;
      let updateValue = {};
      switch (key) {
        case 'deleted':
          updateValue = {
            [key]: value,
            deletedBy: {
              account_id: req.account._id,
              deletedAt: new Date(),
            },
          };
          break;
        case 'status':
          const updatedBy = {
            account_id: req.account._id,
            title: 'Cập nhật trạng thái',
            updatedAt: new Date(),
          };
          updateValue = {
            [key]: value,
            $push: { updatedBy: updatedBy },
          };
          break;
        default:
          break;
      }
      await Account.updateMany(
        { _id: { $in: ids }, deleted: false },
        updateValue
      );
      res.status(200).json({
        success: true,
        message: `Cập nhật ${ids.length} tài khoản thành công`,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
      });
    }
  },
};
