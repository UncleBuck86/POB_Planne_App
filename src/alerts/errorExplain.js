export function explainError(code, ctx={}) {
  switch(code){
    case 'POB_OVER_MAX':
      return {
        title:'POB Exceeds Legal Max',
        message:`Total POB ${ctx.total} exceeds Max ${ctx.max} at ${ctx.location}.`,
        detail:`Date: ${ctx.date}\nLocation: ${ctx.location}\nTotal: ${ctx.total}\nMax: ${ctx.max}\nEffective: ${ctx.effective}`,
        fix:'Reduce inbound numbers, accelerate outbound flights, or validate the max is configured correctly in Admin > Flight Locations.'
      };
    case 'POB_OVER_EFFECTIVE':
      return {
        title:'POB Exceeds Effective Capacity',
        message:`Total POB ${ctx.total} exceeds Effective ${ctx.effective}.`,
        detail:`Date: ${ctx.date}\nTotal: ${ctx.total}\nMax: ${ctx.max}\nFlotel: ${ctx.flotel} Field Boat: ${ctx.fieldBoat}\nEffective: ${ctx.effective}`,
        fix:'Schedule additional outbound flights or obtain additional certified contingency capacity.'
      };
    default:
      return { title:'Notice', message: code };
  }
}
