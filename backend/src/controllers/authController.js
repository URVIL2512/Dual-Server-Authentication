import {
  handleRegistration,
  authenticateUser,
  handlePasswordChange
} from '../services/authService.js';
import { getSystemParams } from '../services/systemService.js';

export async function getParams(req, res, next) {
  try {
    const params = getSystemParams();
    res.json(params);
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const result = await handleRegistration(req.body);
    res.status(201).json({ message: 'Registered', data: result });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authenticateUser(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await handlePasswordChange(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

