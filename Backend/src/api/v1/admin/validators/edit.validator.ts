import { Request, Response, NextFunction } from 'express';

export const editValidator = {
  edit: (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề không tồn tại',
      });
    }
    if (req.body.status && !['initial', 'doing', 'finish', 'pending', 'notFinish'].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
      });
    }

    next();
  },

  editProject: (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID không tồn tại',
      });
    }
    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề không tồn tại',
      });
    }
    if (
      req.body.status &&
      !['active', 'completed', 'archived', 'inactive'].includes(req.body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
      });
    }

    next();
  },

  editAccount: (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Account ID không tồn tại',
      });
    }
    if (!req.body.fullName) {
      return res.status(400).json({
        success: false,
        message: 'Tên người dùng không tồn tại',
      });
    }
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Email không tồn tại',
      });
    }
    if (req.body.status && !['active', 'inactive'].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
      });
    }

    next();
  },

  editProfile: (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.fullName) {
      return res.status(400).json({
        success: false,
        message: 'Tên người dùng không tồn tại',
      });
    }
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Email không tồn tại',
      });
    }
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đổi mật khẩu',
      });
    }
    if (req.body.status) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đổi trạng thái',
      });
    }

    next();
  },
};
