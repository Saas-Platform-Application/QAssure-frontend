// import { Activity } from 'lucide-react';
// import { Card, CardHeader, CardContent } from '@/components/ui/card';
// import { cn } from '@/lib/utils';
// import type { HealthMetric } from '@/types/dashboard';

// const healthMetrics: HealthMetric[] = [
//   { label: 'API Latency', value: '45ms', percentage: 100, variant: 'success' },
//   { label: 'Database Load', value: '42%', percentage: 42, variant: 'info' },
//   { label: 'Storage Usage', value: '78%', percentage: 78, variant: 'warning' },
// ];

// const getVariantStyles = (variant: HealthMetric['variant']) => {
//   switch (variant) {
//     case 'success':
//       return { text: 'text-[#059669]', bg: 'bg-[#059669]' };
//     case 'info':
//       return { text: 'text-[#23dce1]', bg: 'bg-[#23dce1]' };
//     case 'warning':
//       return { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]' };
//   }
// };

// export const SystemHealth = () => {
//   return (
//     <Card className="w-[300px] shrink-0">
//       <CardHeader className="border-b border-[rgba(0,0,0,0.08)] pb-4 pt-4 px-5 h-12 flex items-center justify-between">
//         <h2 className="text-[15px] font-semibold text-[#0f1724] h-[19px]">System Health</h2>
//         <Activity className="w-4 h-4" />
//       </CardHeader>
//       <CardContent className="p-4">
//         <div className="flex flex-col gap-4">
//           {healthMetrics.map((metric, index) => {
//             const styles = getVariantStyles(metric.variant);
//             return (
//               <div key={index} className="flex flex-col gap-2">
//                 <div className="flex items-center justify-between">
//                   <span className="text-xs font-medium text-[#0f1724] h-4 leading-4">
//                     {metric.label}
//                   </span>
//                   <span className={cn('text-xs font-medium h-4 leading-4', styles.text)}>
//                     {metric.value}
//                   </span>
//                 </div>
//                 <div className="bg-white border border-[rgba(0,0,0,0.2)] rounded-full h-1.5 overflow-hidden relative">
//                   <div
//                     className={cn(
//                       'absolute top-[-1px] bottom-[-1px] left-[-1px] rounded-full',
//                       styles.bg
//                     )}
//                     style={{ width: `${metric.percentage}%` }}
//                   />
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </CardContent>
//     </Card>
//   );
// };
