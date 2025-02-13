import { SettingsClient, SettingsValues } from "@devvit/public-api";

export class Discord {
  DISCORD_API_PREFIX = "https://discord.com/api/v10";

  #settingsClient: SettingsClient;

  constructor(settingsClient: SettingsClient) {
    this.#settingsClient = settingsClient;
  }

  async #getSettings(): Promise<SettingsValues> {
    return await this.#settingsClient.getAll();
  }

  #endpoint(path: string) {
    return `${this.DISCORD_API_PREFIX}/${path}`;
  }

  async sendConfirmation(discordId: string, redditUsername: string) {
    const settings = await this.#getSettings();
    const { discordToken } = settings;
    const dmChannelId = await this.getDMChannel(discordId);
    const payload = {
      allowedMentions: {
        parse: ["users"],
      },
      content: `Verified as u/${redditUsername}!`,
    };

    const response = await fetch(
      this.#endpoint(`channels/${dmChannelId}/messages`),
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw "Failed to send verification code.";
    }
  }

  async getDMChannel(discordId: string): Promise<number> {
    const settings = await this.#getSettings();
    const { discordToken } = settings;
    // Setup DM channel
    const channelResponse = await fetch(this.#endpoint(`users/@me/channels`), {
      method: "POST",
      headers: {
        Authorization: `Bot ${discordToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordId }),
    });

    if (!channelResponse.ok) {
      throw "Failed to create DM channel";
    }

    const channelBody = await channelResponse.json();
    return channelBody.id;
  }

  async assignRole(discordId: string, roles: string[]) {
    const {
      discordServerId,
      discordDevRoleId,
      discordModRoleId,
      discordOfficeHoursRoleId,
      discordAnnouncementsRoleId,
      discordToken,
      discordWebhook,
    } = await this.#getSettings();
    if (
      !discordServerId ||
      !discordToken ||
      !discordWebhook ||
      !discordDevRoleId ||
      !discordModRoleId ||
      !discordOfficeHoursRoleId ||
      !discordAnnouncementsRoleId
    ) {
      throw "Discord config missing";
    }

    for (const role of roles) {
      const url = this.#endpoint(
        `guilds/${discordServerId}/members/${discordId}/roles/${role}`
      );

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw "Failed to assign role";
      }
    }
  }

  async updateRole(discordId: string, roles: string[]) {
    const {
      discordServerId,
      discordDevRoleId,
      discordModRoleId,
      discordOfficeHoursRoleId,
      discordAnnouncementsRoleId,
      discordToken,
      discordWebhook,
    } = await this.#getSettings();
    if (
      !discordServerId ||
      !discordToken ||
      !discordWebhook ||
      !discordDevRoleId ||
      !discordModRoleId ||
      !discordOfficeHoursRoleId ||
      !discordAnnouncementsRoleId
    ) {
      throw "Discord config missing";
    }
    const allRoles: string[] = [];
    allRoles.push(String(discordDevRoleId));
    allRoles.push(String(discordModRoleId));
    allRoles.push(String(discordOfficeHoursRoleId));
    allRoles.push(String(discordAnnouncementsRoleId));
    for (const r of allRoles) {
      const url = this.#endpoint(
        `guilds/${discordServerId}/members/${discordId}/roles/${r}`
      );
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw "Failed to remove role";
      }
    }
    for (const role of roles) {
      const url = this.#endpoint(
        `guilds/${discordServerId}/members/${discordId}/roles/${role}`
      );

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw "Failed to assign role";
      }
    }
  }

  async removeRole(discordId: string, roles: string[]) {
    const {
      discordServerId,
      discordToken,
      discordWebhook,
      discordDevRoleId,
      discordModRoleId,
      discordOfficeHoursRoleId,
      discordAnnouncementsRoleId,
    } = await this.#getSettings();
    if (
      !discordServerId ||
      !discordToken ||
      !discordWebhook ||
      !discordDevRoleId ||
      !discordModRoleId ||
      !discordOfficeHoursRoleId ||
      !discordAnnouncementsRoleId
    ) {
      throw "Discord config missing";
    }

    for (const role of roles) {
      const url = this.#endpoint(
        `guilds/${discordServerId}/members/${discordId}/roles/${role}`
      );
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw "Failed to remove role";
      }
    }
  }

  async sendVerificationCode(
    redditUsername: string,
    discordId: string,
    code: string
  ): Promise<string> {
    const settings = await this.#getSettings();
    const { discordToken } = settings;

    const channelId = await this.getDMChannel(discordId);

    const payload = {
      allowedMentions: {
        parse: ["users"],
      },
      content: `Attempting to verify u/${redditUsername} as <@${discordId}>. Your code is ${code}`,
    };

    const response = await fetch(
      this.#endpoint(`channels/${channelId}/messages`),
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${discordToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw "Failed to send verification code.";
    }

    const body = await response.json();
    return body.id;
  }

  async getDiscordId(discordUsername: string) {
    const config = await this.#getSettings();
    const { discordServerId, discordToken } = config;
    const url = this.#endpoint(
      `guilds/${discordServerId}/members/search?query=${discordUsername}`
    );
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bot ${discordToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch discord user id from username");
      return null;
    }

    const body: Array<any> = await response.json();
    if (!body.length) {
      console.error("Discord user ID not found in response");
      return null;
    }

    const match = body.find(({ user }) => {
      console.log("checking user", user);
      if (user.username) {
        return user.username.toLowerCase() === discordUsername.toLowerCase();
      }
    });
    return match?.user.id;
  }
}
