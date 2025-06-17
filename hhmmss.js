function parseHhMmSs(v) {
  const vs = v.split(':')
  let secs = Number(vs.pop())
  const minutes = vs.pop()
  if (minutes) secs += Number(minutes) * 60
  const hours = vs.pop()
  if (hours) secs += Number(hours) * 60 * 60
  return secs
}

function toHhMmSs(v) {
  const hours = Math.floor(v / (60 * 60))
  const minutes = Math.floor(v / 60) % 60
  const seconds = v % 60
  let str = seconds.toString().padStart(2, '0')
  if (minutes > 0) str = `${hours > 0 ? minutes.toString().padStart(2, '0') : minutes}:${str}`
  if (hours > 0) str = `${hours}:${str}`
  return str
}
