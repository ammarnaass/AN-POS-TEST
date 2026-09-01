import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background relative overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-8 selection:bg-primary/20" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute -top-32 -right-32 w-80 sm:w-[500px] h-80 sm:h-[500px] rounded-full bg-primary/10 blur-[80px] sm:blur-[120px] pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-32 -left-32 w-72 sm:w-[450px] h-72 sm:h-[450px] rounded-full bg-tertiary/10 blur-[70px] sm:blur-[100px] pointer-events-none" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full my-auto flex items-center justify-center py-2 sm:py-4">
        <Outlet />
      </div>
    </div>
  );
}

