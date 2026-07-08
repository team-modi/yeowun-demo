import { RouterProvider } from "react-router-dom";

// router
import { router } from "@router/router";

// styles (index.css → tokens.css, base.css = 공통 컴포넌트 스타일)
import "@styles/index.css";
import "@styles/base.css";

export default function App() {
  return <RouterProvider router={router} />;
}
