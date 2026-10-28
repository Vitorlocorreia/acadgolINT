export function advanceMonthOptions(today:string):string[]{
 const [year,month]=today.slice(0,7).split('-').map(Number)
 return Array.from({length:13},(_,offset)=>new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7))
}
export function nextBillingMonth(today:string){return advanceMonthOptions(today)[1]}
