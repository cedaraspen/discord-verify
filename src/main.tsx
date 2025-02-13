// Learn more at developers.reddit.com/docs
import {
  Devvit,
  RedisClient,
  useAsync,
  useState,
  useForm,
  SettingsClient,
} from "@devvit/public-api";
import { SafeUser, User } from "./user.js";
import { Discord } from "./discord.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
});

Devvit.addSettings([
  {
    label: "Discord webhook",
    helpText: "Top secret! Does not appear in the app.",
    name: "discordWebhook",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord server name",
    helpText: "This is publicly visible.",
    name: "discordServerName",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord server ID",
    helpText: "Right click on your server icon > Copy ID",
    name: "discordServerId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord Developer ID",
    helpText:
      "The ID of the role you want to assign after verification (e.g. 1050228030523580000",
    name: "discordDevRoleId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord Mod ID",
    helpText:
      "The ID of the role you want to assign after verification (e.g. 1050228030523580000",
    name: "discordModRoleId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord Office Hours ID",
    helpText:
      "The ID of the role you want to assign after verification (e.g. 1050228030523580000",
    name: "discordOfficeHoursRoleId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord Announcements ID",
    helpText:
      "The ID of the role you want to assign after verification (e.g. 1050228030523580000",
    name: "discordAnnouncementsRoleId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord channel ID",
    helpText:
      "The channel ID for verification confirmation. Make sure its accessible by @everyone",
    placeholder: "1111096836573364000",
    name: "discordChannelId",
    type: "string",
    scope: "installation",
  },
  {
    label: "Discord App Token",
    type: "string",
    helpText: "Secret app token",
    name: "discordToken",
    isSecret: true,
    scope: "app",
  },
]);

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: "Create a Discord verification post",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    await reddit.submitPost({
      title: "Verify your Discord username for the Reddit Devs server",
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="small">Loading ...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: "Created post!" });
  },
});

async function getUserRecord(
  redis: RedisClient,
  userId: string
): Promise<SafeUser | null> {
  const userRecord = await redis.get(userId);
  if (!userRecord) {
    return null;
  }
  return SafeUser.parse(JSON.parse(userRecord));
}

async function setUserRecord(
  redis: RedisClient,
  userId: string,
  data: User
): Promise<SafeUser> {
  const userRecord = User.parse(data);
  await redis.set(userId, JSON.stringify(userRecord));
  return SafeUser.parse(userRecord);
}

// Add a post type definition
Devvit.addCustomPostType({
  name: "Verify your Discord account",
  height: "regular",
  render: ({ reddit, redis, postId, userId, settings, ui }) => {
    const discord = new Discord(settings);

    const [user, setUser] = useState<SafeUser | null>(async () => {
      if (!userId) {
        return null;
      }

      const dataRecord = await getUserRecord(redis, userId);
      if (!dataRecord) {
        return null;
      }
      return dataRecord;
    });

    const [username] = useState<string | null>(async () => {
      if (!userId) {
        return null;
      }
      const user = await reddit.getUserById(userId);
      if (!user) {
        return null;
      }
      return user?.username;
    });

    let isM = false;
    let isD = false;
    let isA = false;
    let isOH = false;
    if (user) {
      for (const r of user!.roles) {
        if (r === "1131418268436013287") {
          isM = true;
        }
        if (r === "1050228030523584532") {
          isD = true;
        }
        if (r === "1106686876124991600") {
          isA = true;
        }
        if (r === "1118624243094147235") {
          isOH = true;
        }
      }
    }

    const [isMod, setIsMod] = useState(isM);
    const [isDev, setIsDev] = useState(isD);
    const [isOfficeHours, setIsOfficeHours] = useState(isOH);
    const [isAnnouncements, setIsAnnouncements] = useState(isA);

    const isModSelect: Devvit.Blocks.OnPressEventHandler = async () => {
      setIsMod(!isMod);
    };
    const isDevSelect: Devvit.Blocks.OnPressEventHandler = async () => {
      setIsDev(!isDev);
    };
    const isOfficeHoursSelect: Devvit.Blocks.OnPressEventHandler = async () => {
      setIsOfficeHours(!isOfficeHours);
    };

    const isAnnouncementsSelect: Devvit.Blocks.OnPressEventHandler =
      async () => {
        setIsAnnouncements(!isAnnouncements);
      };

    const verificationForm = useForm(
      {
        fields: [
          {
            name: "discordUsername",
            label: "Discord Username",
            type: "string",
            required: true,
          },
        ],
      },
      async (values) => {
        const { discordUsername } = values;
        if (!userId) {
          ui.showToast("Must be logged in to use this app");
          return;
        }

        if (!discordUsername) {
          ui.showToast("Discord username not provided");
          return;
        }
        const {
          discordDevRoleId,
          discordModRoleId,
          discordOfficeHoursRoleId,
          discordAnnouncementsRoleId,
        } = await settings.getAll();
        //TODO add roles from settings
        let roles: string[] = [];
        if (isMod) {
          roles.push(String(discordModRoleId));
        }
        if (isDev) {
          roles.push(String(discordDevRoleId));
        }
        if (isOfficeHours) {
          roles.push(String(discordOfficeHoursRoleId));
        }
        if (isAnnouncements) {
          roles.push(String(discordAnnouncementsRoleId));
        }

        const verificationCode = [...Array(6)]
          .map(() => Math.random().toString(36)[2])
          .join("");
        const discordId = await discord.getDiscordId(discordUsername);
        if (!discordId) {
          ui.showToast("User does not exist on server");
          return;
        }
        const discordMessageId = await discord.sendVerificationCode(
          username!,
          discordId,
          verificationCode
        );
        const userRecord = await setUserRecord(redis, userId, {
          discordUsername,
          discordId,
          discordMessageId,
          verificationCode,
          roles,
          verificationStatus: false,
        });
        setUser(userRecord);
      }
    );

    async function onVerify() {
      await discord.sendConfirmation(user!.discordId!, username!);
      const {
        discordDevRoleId,
        discordModRoleId,
        discordOfficeHoursRoleId,
        discordAnnouncementsRoleId,
      } = await settings.getAll();
      //TODO add roles from settings
      let roles: string[] = [];
      if (isMod) {
        roles.push(String(discordModRoleId));
      }
      if (isDev) {
        roles.push(String(discordDevRoleId));
      }
      if (isOfficeHours) {
        roles.push(String(discordOfficeHoursRoleId));
      }
      if (isAnnouncements) {
        roles.push(String(discordAnnouncementsRoleId));
      }
      await discord.assignRole(user!.discordId!, roles);
      // const comment = await reddit.submitComment({
      //   id: postId!,
      //   text: `u/${username} verified as ${user?.discordUsername} on Discord!`,
      // });
      user!.roles = roles;
      user!.verificationStatus = true;
      await verify(userId!, redis);
      ui.showToast("Verified!");
      setUser({ ...user!, verificationStatus: true });
      setUserRecord(redis, userId!, user!);
    }

    async function onUpdate() {
      const {
        discordDevRoleId,
        discordModRoleId,
        discordOfficeHoursRoleId,
        discordAnnouncementsRoleId,
      } = await settings.getAll();
      //TODO add roles from settings
      let roles: string[] = [];
      if (isMod) {
        roles.push(String(discordModRoleId));
      }
      if (isDev) {
        roles.push(String(discordDevRoleId));
      }
      if (isOfficeHours) {
        roles.push(String(discordOfficeHoursRoleId));
      }
      if (isAnnouncements) {
        roles.push(String(discordAnnouncementsRoleId));
      }
      await discord.updateRole(user!.discordId!, roles);
      ui.showToast("Roles updated!");
      user!.roles = roles;
      user!.verificationStatus = true;
      setUser({ ...user!, verificationStatus: true });
      setUserRecord(redis, userId!, user!);
    }

    async function onUnlink() {
      if (!user) {
        throw "No user configured";
      }
      if (user.discordId) {
        await discord.removeRole(user!.discordId!, user.roles);
      }
      if (user.commentId) {
        await reddit.submitComment({
          id: user.commentId,
          text: `This link has been revoked!`,
        });
      }

      // Add a removal comment
      await redis.del(userId!);
      setUser(null);
    }

    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <spacer size="small" />
        <image
          width="50px"
          height="50px"
          url="loading.gif"
          imageHeight="200px"
          imageWidth="200px"
        />
        <spacer size="small" />
        {!user && (
          <>
            <text size="small" wrap={true} width={"70%"}>
              Hello {username}! Please verify your Discord account below. Select
              the server roles you would like to access:
            </text>
            <spacer size="small" />
            <vstack alignment="center">
              <vstack alignment="start">
                <button
                  size="small"
                  onPress={isDevSelect}
                  icon={isDev ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Developer channels
                </button>
                <button
                  size="small"
                  onPress={isModSelect}
                  icon={isMod ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Moderator channels
                </button>
                <button
                  size="small"
                  onPress={isOfficeHoursSelect}
                  icon={isOfficeHours ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Office hours notifications
                </button>
                <button
                  size="small"
                  onPress={isAnnouncementsSelect}
                  icon={isAnnouncements ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Announcements notifications
                </button>
              </vstack>
            </vstack>
            <spacer size="small" />
            <button
              size="small"
              onPress={() => {
                ui.showForm(verificationForm);
              }}
            >
              {" "}
              Verify me!{" "}
            </button>
          </>
        )}
        {user && !user.verificationStatus && (
          <CodeScreen onVerify={onVerify} onUnlink={onUnlink} />
        )}
        {user && user.verificationStatus && (
          <>
            <vstack alignment="center">
              <vstack alignment="start">
                <button
                  size="small"
                  onPress={isDevSelect}
                  icon={isDev ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Developer channels
                </button>
                <button
                  size="small"
                  onPress={isModSelect}
                  icon={isMod ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Moderator channels
                </button>
                <button
                  size="small"
                  onPress={isOfficeHoursSelect}
                  icon={isOfficeHours ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Office hours notifications
                </button>
                <button
                  size="small"
                  onPress={isAnnouncementsSelect}
                  icon={isAnnouncements ? "checkbox-fill" : "checkbox"}
                  appearance="plain"
                >
                  Announcements notifications
                </button>
              </vstack>
            </vstack>
            <spacer size="small" />
            <VerifiedScreen
              onUnlink={onUnlink}
              onUpdate={onUpdate}
              discordUsername={user.discordUsername!}
            />
          </>
        )}
      </vstack>
    );
  },
});

async function checkVerificationCode(
  userId: string,
  code: string,
  redis: RedisClient
): Promise<boolean> {
  const userData = await redis.get(userId);
  if (!userData) {
    return false;
  }
  const user = User.parse(JSON.parse(userData));
  return code === user.verificationCode;
}

async function verify(userId: string, redis: RedisClient) {
  const userData = await redis.get(userId);
  if (!userData) {
    throw "Invalid user, cannot verify";
  }

  const user = User.parse(JSON.parse(userData));
  user.verificationStatus = true;
  // user.commentId = commentId;

  setUserRecord(redis, userId, user);
}

type VerifiedScreenProps = {
  onUnlink: () => Promise<void>;
  onUpdate: () => Promise<void>;
  discordUsername: string;
};

const VerifiedScreen: Devvit.BlockComponent<VerifiedScreenProps> = ({
  onUnlink,
  discordUsername,
  onUpdate,
}) => {
  return (
    <vstack>
      <text> {`Verified as ${discordUsername} on Discord`} ✅</text>
      <spacer size="small" />
      <hstack gap="small">
        <button size="small" icon="save" onPress={onUpdate}>
          {" "}
          Update Roles{" "}
        </button>
        <button size="small" icon="delete" onPress={onUnlink}>
          {" "}
          Unlink{" "}
        </button>
      </hstack>
    </vstack>
  );
};

type CodeScreenProps = {
  onVerify: () => Promise<void>;
  onUnlink: () => Promise<void>;
};

const CodeScreen: Devvit.BlockComponent<CodeScreenProps> = (
  { onVerify, onUnlink },
  { ui, userId, redis }
) => {
  const codeForm = useForm(
    {
      fields: [
        {
          name: "code",
          label: "Verification code",
          type: "string",
          required: true,
        },
      ],
    },
    async (values) => {
      const verificationResult = await checkVerificationCode(
        userId!,
        values.code,
        redis
      );
      if (verificationResult) {
        await onVerify();
      } else {
        ui.showToast("Invalid verification code");
      }
    }
  );
  return (
    <vstack gap="medium" width={"100%"} alignment="center middle">
      <text size="small" width={"70%"} wrap={true}>
        Almost done! Check your Discord dms for a message with your verification
        code. You can unlink your account at any time.
      </text>
      <hstack gap="small">
        <button
          size="small"
          onPress={() => {
            ui.showForm(codeForm);
          }}
        >
          Enter code
        </button>
        <button size="small" onPress={onUnlink}>
          Unlink
        </button>
      </hstack>
    </vstack>
  );
};

type RoleSelectProps = {
  isDev: boolean;
  isMod: boolean;
  isOfficeHours: boolean;
  isAnnouncements: boolean;
  isDevSelect: () => Promise<void>;
  isModSelect: () => Promise<void>;
  isOfficeHoursSelect: () => Promise<void>;
  isAnnouncementsSelect: () => Promise<void>;
};

export default Devvit;
