import User from "../../models/User";
import Tenant from "../../models/Tenant"; 
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import Queue from "../../models/Queue";

interface Request {
  email: string;
  password: string;
}

interface Response {
  user: User;
  token: string;
  refreshToken: string;
  usuariosOnline?: User[];
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Queue, as: "queues" }]
  });

  if (!user) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  if (!(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const tenant = await Tenant.findOne({ where: { id: user.tenantId } });

  if (!tenant || tenant.status !== "active") {
    throw new AppError("ERR_COMPANY_NOT_ACTIVE", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await user.update({
    isOnline: true,
    status: "online",
    lastLogin: new Date()
  });

  const usuariosOnline = await User.findAll({
    where: { tenantId: user.tenantId, isOnline: true },
    attributes: ["id", "email", "status", "lastOnline", "name", "lastLogin"]
  });

  return {
    user,
    token,
    refreshToken,
    usuariosOnline
  };
};

export default AuthUserService;
