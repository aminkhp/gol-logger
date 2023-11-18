import { Gol, LogLevel } from "gol-logger";
import { faker } from "@faker-js/faker";

const gol = new Gol(LogLevel.Debug, {
  withStyles: true,
  store: "idb",
  maxCount: 1000,
  expireTime: 30_000,
  debug: true,
});

const logger = gol.getLogger("Module A");

const tags = ["tag 1", "tag 2", "tag 3", "tag 4", "tag 5", "tag 6"];

function getTag() {
  return tags[Math.floor(Math.random() * 6)];
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function log() {
  const count = Math.floor(Math.random() * 100);
  console.log(">>>db", "count", count, count * 4);
  for (let i = 0; i < count; i++) {
    gol.error(getTag(), faker.lorem.sentence(), {
      name: faker.person.fullName(),
      bio: faker.person.bio(),
      job: faker.person.jobTitle(),
    });
    gol.warn(getTag(), faker.lorem.sentence(), {
      city: faker.location.city(),
      country: faker.location.country(),
      location: {
        lat: faker.location.latitude(),
        long: faker.location.longitude(),
      },
    });
    gol.info(
      getTag(),
      faker.lorem.sentence(),
      faker.date.anytime(),
      faker.animal.bird()
    );
    gol.debug(
      getTag(),
      faker.lorem.sentence(),
      faker.color.rgb(),
      faker.number.float(),
      faker.phone.number()
    );
    await delay(Math.random() * 2);
  }
}

async function main() {
  // await log();

  for(let i = 0; i < 50; i++) {
    gol.debug("start", i);
  }
  
  document.getElementById("add")!.addEventListener("click", () => {
    log();
  });

  document.getElementById("clear")?.addEventListener("click", () => {
    gol.clean();
  });

  document.getElementById("report")?.addEventListener("click", async () => {
    console.log("report");
    const files = await gol.report();
    if (!files) return;

    files.forEach((file) => download(file));
  });
}

function download(file: File) {
  const url = URL.createObjectURL(file);

  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;

  a.click();
}

main();
