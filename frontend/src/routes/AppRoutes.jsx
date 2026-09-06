import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { EditBookPage } from '../pages/EditBookPage.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { MyLibraryPage } from '../pages/MyLibraryPage.jsx';
import { NewBookPage } from '../pages/NewBookPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { PublicOnlyRoute } from './PublicOnlyRoute.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="my-library" element={<MyLibraryPage />} />
          <Route path="books/new" element={<NewBookPage />} />
          <Route path="books/:id/edit" element={<EditBookPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
