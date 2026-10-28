import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import FormPage from "./pages/FormPage";
import AdminLayout from "./pages/admin/AdminLayout";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import FormsList from "./pages/admin/FormsList";
import FormBuilder from "./pages/admin/FormBuilder";
import FormResponses from "./pages/admin/FormResponses";
import Settings from "./pages/admin/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/f/:slug" element={<FormPage />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="forms" element={<FormsList />} />
        <Route path="forms/:id/edit" element={<FormBuilder />} />
        <Route path="forms/:id/responses" element={<FormResponses />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
