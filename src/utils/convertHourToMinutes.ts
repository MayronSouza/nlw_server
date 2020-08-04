export default function convertHourToMinutes(time: string) {
  const [hour, minutes] = time.split(':').map(Number)
  const hoursInMinutes = (hour * 60) + minutes

  return hoursInMinutes
}