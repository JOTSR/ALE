console.table(Deno.args)
console.log(await Deno.stat(Deno.args[0]))