import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background relative overflow-hidden p-4" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-background/50" />
        <div className="absolute top-1/4 right-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-primary/5 blur-[80px] sm:blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-secondary/5 blur-[60px] sm:blur-[100px]" />
      </div>
      <div className="relative z-10 w-full flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
}
