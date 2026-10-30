import { redirect } from 'next/navigation';

export const instant = false;

export default function SchedulingPage() {
  redirect('/customer/module/scheduling');
}
