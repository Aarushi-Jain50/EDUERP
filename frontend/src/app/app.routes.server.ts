import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/secure-login',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'faculty/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'student/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'parent/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
