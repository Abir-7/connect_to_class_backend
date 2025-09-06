import { Router } from "express";
import { UserRoute } from "../modules/users/user/user.route";
import { AuthRoute } from "../modules/auth/auth.route";
import { UserProfileRoute } from "../modules/users/user_profile/user_profile.route";
import { StripeRoute } from "../modules/stripe/stripe.route";
import { UserKidsRoute } from "../modules/users/users_kids/users_kids.route";
import { KidsClassRoute } from "../modules/kids_class/kids_class.route";
import { EventRoute } from "../modules/events/event.router";
import { PostRoute } from "../modules/news_feed/post/post.route";
import { CommentRoute } from "../modules/news_feed/comment/comment.route";
import { LikeRoute } from "../modules/news_feed/like/like.route";

const router = Router();
const api_routes = [
  { path: "/user", route: UserRoute },
  { path: "/user", route: UserProfileRoute },
  { path: "/user", route: UserKidsRoute },
  { path: "/auth", route: AuthRoute },
  { path: "/stripe", route: StripeRoute },
  { path: "/class", route: KidsClassRoute },
  { path: "/event", route: EventRoute },
  { path: "/post", route: PostRoute },
  { path: "/comment", route: CommentRoute },
  { path: "/like", route: LikeRoute },
];
api_routes.forEach((route) => router.use(route.path, route.route));
export default router;
