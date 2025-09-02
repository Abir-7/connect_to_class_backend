import { Router } from "express";
import { UserRoute } from "../modules/users/user/user.route";
import { AuthRoute } from "../modules/auth/auth.route";
import { UserProfileRoute } from "../modules/users/user_profile/user_profile.route";
import { StripeRoute } from "../modules/stripe/stripe.route";

const router = Router();
const api_routes = [
  { path: "/user", route: UserRoute },
  { path: "/user", route: UserProfileRoute },
  { path: "/auth", route: AuthRoute },
  { path: "/stripe", route: StripeRoute },
];
api_routes.forEach((route) => router.use(route.path, route.route));
export default router;
