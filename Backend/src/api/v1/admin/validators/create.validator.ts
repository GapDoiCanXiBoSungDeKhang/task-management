import { NextFunction, Request, Response } from 'express';

// helpers
import isValidPassword from '../../../../helpers/isPassword';

// edit and create validators
export const createValidator = {
  create: (req: Request, res: Response, next: NextFunction) => {
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

  createdProject: (req: Request, res: Response, next: NextFunction) => {
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

  createAccount: (req: Request, res: Response, next: NextFunction) => {
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
    if (!req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không tồn tại',
      });
    }
    if (!isValidPassword(req.body.password)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không hợp lệ',
      });
    }
    if (!req.body.confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu xác thực không tồn tại',
      });
    }
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không khớp',
      });
    }

    next();
  },
};
