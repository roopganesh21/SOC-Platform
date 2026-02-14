// Regex helpers and patterns for Linux auth.log-style entries

// Month abbreviations used in syslog-style timestamps
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Generic timestamp prefix: "Jan 15 08:23:45"
const TIMESTAMP_PREFIX = /^(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})/;

// SSH failed password attempts (including invalid user)
// Example:
// Jan 15 08:23:45 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
// Jan 15 08:23:45 server sshd[1234]: Failed password for john from 192.168.1.100 port 22 ssh2
const SSH_FAILED_PASSWORD = /Failed password for (?:(invalid user)\s+)?(?<user>\S+) from (?<ip>\d+\.\d+\.\d+\.\d+)/;

// SSH accepted password
// Example:
// Jan 15 08:24:32 server sshd[1240]: Accepted password for john from 10.0.0.50 port 22 ssh2
const SSH_ACCEPTED_PASSWORD = /Accepted password for (?<user>\S+) from (?<ip>\d+\.\d+\.\d+\.\d+)/;

// Sudo violation (user not in sudoers)
// Example:
// Jan 15 09:15:22 server sudo: alice : user NOT in sudoers ; ...
const SUDO_VIOLATION = /sudo:\s+(?<user>\S+)\s*:\s*user NOT in sudoers/i;

// Utility to parse the syslog-style timestamp at the start of a line into a Date.
function parseTimestamp(line) {
  const match = line.match(TIMESTAMP_PREFIX);
  if (!match || !match.groups) {
    return null;
  }

  const { month, day, time } = match.groups;
  const [hour, minute, second] = time.split(':').map((v) => parseInt(v, 10));
  const monthIndex = MONTHS.indexOf(month);

  if (monthIndex === -1) {
    return null;
  }

  const year = new Date().getFullYear();
  const date = new Date(Date.UTC(year, monthIndex, parseInt(day, 10), hour, minute, second));
  return date;
}

module.exports = {
  TIMESTAMP_PREFIX,
  SSH_FAILED_PASSWORD,
  SSH_ACCEPTED_PASSWORD,
  SUDO_VIOLATION,
  parseTimestamp,
};
