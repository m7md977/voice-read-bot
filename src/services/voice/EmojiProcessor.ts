/**
 * Emoji Processing Service for Voice Reading
 * Converts emojis to readable text descriptions
 */

interface EmojiMapping {
  [key: string]: string;
}

export class EmojiProcessor {
  private static readonly EMOJI_MAPPINGS: EmojiMapping = {
    // Faces and emotions
    '😀': 'grinning face',
    '😃': 'grinning face with big eyes',
    '😄': 'grinning face with smiling eyes',
    '😁': 'beaming face with smiling eyes',
    '😆': 'grinning squinting face',
    '😅': 'grinning face with sweat',
    '🤣': 'rolling on the floor laughing',
    '😂': 'face with tears of joy',
    '🙂': 'slightly smiling face',
    '🙃': 'upside down face',
    '😉': 'winking face',
    '😊': 'smiling face with smiling eyes',
    '😇': 'smiling face with halo',
    '🥰': 'smiling face with hearts',
    '😍': 'smiling face with heart eyes',
    '🤩': 'star struck',
    '😘': 'face blowing a kiss',
    '😗': 'kissing face',
    '☺️': 'smiling face',
    '😚': 'kissing face with closed eyes',
    '😙': 'kissing face with smiling eyes',
    '🥲': 'smiling face with tear',
    
    // Sad and negative emotions
    '😔': 'pensive face',
    '😟': 'worried face',
    '😕': 'confused face',
    '🙁': 'slightly frowning face',
    '☹️': 'frowning face',
    '😣': 'persevering face',
    '😖': 'confounded face',
    '😫': 'tired face',
    '😩': 'weary face',
    '🥺': 'pleading face',
    '😢': 'crying face',
    '😭': 'loudly crying face',
    '😤': 'face with steam from nose',
    '😠': 'angry face',
    '😡': 'pouting face',
    '🤬': 'face with symbols on mouth',
    '🤯': 'exploding head',
    
    // Surprised and thinking
    '😳': 'flushed face',
    '🥵': 'hot face',
    '🥶': 'cold face',
    '😱': 'face screaming in fear',
    '😨': 'fearful face',
    '😰': 'anxious face with sweat',
    '😥': 'sad but relieved face',
    '😓': 'downcast face with sweat',
    '🤗': 'hugging face',
    '🤔': 'thinking face',
    '🤭': 'face with hand over mouth',
    '🤫': 'shushing face',
    '🤐': 'zipper mouth face',
    
    // Special faces
    '🤤': 'drooling face',
    '😴': 'sleeping face',
    '😪': 'sleepy face',
    '😵': 'dizzy face',
    '🤪': 'zany face',
    '😜': 'winking face with tongue',
    '😝': 'squinting face with tongue',
    '😛': 'face with tongue',
    '🤑': 'money mouth face',
    '🤓': 'nerd face',
    '😎': 'smiling face with sunglasses',
    '🤡': 'clown face',
    '👻': 'ghost',
    '💀': 'skull',
    '☠️': 'skull and crossbones',
    
    // Hearts and love
    '❤️': 'red heart',
    '🧡': 'orange heart',
    '💛': 'yellow heart',
    '💚': 'green heart',
    '💙': 'blue heart',
    '💜': 'purple heart',
    '🤎': 'brown heart',
    '🖤': 'black heart',
    '🤍': 'white heart',
    '💔': 'broken heart',
    '❣️': 'heart exclamation',
    '💕': 'two hearts',
    '💞': 'revolving hearts',
    '💓': 'beating heart',
    '💗': 'growing heart',
    '💖': 'sparkling heart',
    '💘': 'heart with arrow',
    '💝': 'heart with ribbon',
    '💟': 'heart decoration',
    
    // Hand gestures
    '👍': 'thumbs up',
    '👎': 'thumbs down',
    '👌': 'OK hand',
    '✌️': 'victory hand',
    '🤞': 'crossed fingers',
    '🤟': 'love you gesture',
    '🤘': 'sign of the horns',
    '🤙': 'call me hand',
    '👈': 'backhand index pointing left',
    '👉': 'backhand index pointing right',
    '👆': 'backhand index pointing up',
    '👇': 'backhand index pointing down',
    '☝️': 'index pointing up',
    '✋': 'raised hand',
    '🤚': 'raised back of hand',
    '🖐️': 'hand with fingers splayed',
    '🖖': 'vulcan salute',
    '👋': 'waving hand',
    '🤝': 'handshake',
    '👏': 'clapping hands',
    '🙌': 'raising hands',
    '👐': 'open hands',
    '🤲': 'palms up together',
    '🙏': 'folded hands',
    
    // Common symbols and objects
    '🔥': 'fire',
    '⭐': 'star',
    '🌟': 'glowing star',
    '✨': 'sparkles',
    '💫': 'dizzy',
    '⚡': 'lightning bolt',
    '☀️': 'sun',
    '🌙': 'crescent moon',
    '🌈': 'rainbow',
    '☔': 'umbrella with rain drops',
    '❄️': 'snowflake',
    '🎉': 'party popper',
    '🎊': 'confetti ball',
    '🎈': 'balloon',
    '🎁': 'wrapped gift',
    '🏆': 'trophy',
    '🥇': 'first place medal',
    '🥈': 'second place medal',
    '🥉': 'third place medal',
    '🏅': 'sports medal',
    '🎯': 'direct hit',
    '🎪': 'circus tent',
    '🎭': 'performing arts',
    '🎨': 'artist palette',
    '🎵': 'musical note',
    '🎶': 'musical notes',
    '🎤': 'microphone',
    '🎧': 'headphone',
    '📱': 'mobile phone',
    '💻': 'laptop computer',
    '🖥️': 'desktop computer',
    '⌨️': 'keyboard',
    '🖱️': 'computer mouse',
    '📺': 'television',
    '📷': 'camera',
    '📸': 'camera with flash',
    '🔔': 'bell',
    '🔕': 'bell with slash',
    '📢': 'loudspeaker',
    '📣': 'megaphone',
    '📯': 'postal horn',
    
    // Food and drink
    '🍎': 'red apple',
    '🍕': 'pizza',
    '🍔': 'hamburger',
    '🌭': 'hot dog',
    '🥪': 'sandwich',
    '🌮': 'taco',
    '🌯': 'burrito',
    '🍜': 'steaming bowl',
    '🍝': 'spaghetti',
    '🍱': 'bento box',
    '🍙': 'rice ball',
    '🍘': 'rice cracker',
    '🍚': 'cooked rice',
    '🍛': 'curry rice',
    '🍲': 'pot of food',
    '🥗': 'green salad',
    '🍿': 'popcorn',
    '🧊': 'ice cube',
    '🥤': 'cup with straw',
    '☕': 'hot beverage',
    '🍺': 'beer mug',
    '🍻': 'clinking beer mugs',
    '🥂': 'clinking glasses',
    '🍷': 'wine glass',
    '🥃': 'tumbler glass',
    '🍸': 'cocktail glass',
    '🍹': 'tropical drink',
    '🧃': 'beverage box',
    '🥛': 'glass of milk',
    
    // Animals
    '🐶': 'dog face',
    '🐱': 'cat face',
    '🐭': 'mouse face',
    '🐹': 'hamster face',
    '🐰': 'rabbit face',
    '🦊': 'fox face',
    '🐻': 'bear face',
    '🐼': 'panda face',
    '🐨': 'koala',
    '🐯': 'tiger face',
    '🦁': 'lion face',
    '🐮': 'cow face',
    '🐷': 'pig face',
    '🐸': 'frog face',
    '🐵': 'monkey face',
    '🙈': 'see no evil monkey',
    '🙉': 'hear no evil monkey',
    '🙊': 'speak no evil monkey',
    '🐒': 'monkey',
    '🐔': 'chicken',
    '🐧': 'penguin',
    '🐦': 'bird',
    '🐤': 'baby chick',
    '🐣': 'hatching chick',
    '🐥': 'front facing baby chick',
    '🦆': 'duck',
    '🦅': 'eagle',
    '🦉': 'owl',
    '🦇': 'bat',
    '🐺': 'wolf face',
    '🐗': 'boar',
    '🐴': 'horse face',
    '🦄': 'unicorn face',
    '🐝': 'honeybee',
    '🐛': 'bug',
    '🦋': 'butterfly',
    '🐌': 'snail',
    '🐞': 'lady beetle',
    '🐜': 'ant',
    '🦟': 'mosquito',
    '🦗': 'cricket',
    '🕷️': 'spider',
    '🦂': 'scorpion',
    '🐢': 'turtle',
    '🐍': 'snake',
    '🦎': 'lizard',
    '🐙': 'octopus',
    '🦑': 'squid',
    '🦐': 'shrimp',
    '🦀': 'crab',
    '🐡': 'blowfish',
    '🐠': 'tropical fish',
    '🐟': 'fish',
    '🐬': 'dolphin',
    '🐳': 'spouting whale',
    '🐋': 'whale',
    '🦈': 'shark',
    
    // Arrows and symbols
    '⬆️': 'up arrow',
    '⬇️': 'down arrow',
    '⬅️': 'left arrow',
    '➡️': 'right arrow',
    '↗️': 'up right arrow',
    '↘️': 'down right arrow',
    '↙️': 'down left arrow',
    '↖️': 'up left arrow',
    '↕️': 'up down arrow',
    '↔️': 'left right arrow',
    '🔄': 'counterclockwise arrows button',
    '🔃': 'clockwise vertical arrows',
    '🔂': 'repeat single button',
    '🔁': 'repeat button',
    '🔀': 'twisted rightwards arrows',
    '🔼': 'upwards button',
    '🔽': 'downwards button',
    '⏪': 'fast reverse button',
    '⏩': 'fast forward button',
    '⏯️': 'play or pause button',
    '⏮️': 'last track button',
    '⏭️': 'next track button',
    '⏸️': 'pause button',
    '⏹️': 'stop button',
    '⏺️': 'record button',
    '⚠️': 'warning sign',
    '🚫': 'prohibited',
    '❌': 'cross mark',
    '✅': 'check mark button',
    '✔️': 'check mark',
    '❎': 'cross mark button',
    '➕': 'plus sign',
    '➖': 'minus sign',
    '➗': 'division sign',
    '✖️': 'multiplication sign',
    '💯': 'hundred points symbol',
    '💢': 'anger symbol',
    '💥': 'collision',
    '💦': 'sweat droplets',
    '💨': 'dashing away',
    '🕳️': 'hole',
    '💣': 'bomb',
    '💤': 'sleeping symbol'
  };

  private static readonly EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;

  /**
   * Process text and convert emojis to readable descriptions
   */
  public static processEmojis(text: string, options: {
    mode: 'replace' | 'explain' | 'both';
    addPauses: boolean;
  } = { mode: 'explain', addPauses: true }): string {
    if (!text) return text;

    let processedText = text;

    // Find all emojis in the text
    const emojis = text.match(this.EMOJI_REGEX) || [];
    
    if (emojis.length === 0) return text;

    // Process each emoji
    for (const emoji of emojis) {
      const description = this.EMOJI_MAPPINGS[emoji] || this.getGenericEmojiDescription(emoji);
      
      switch (options.mode) {
        case 'replace':
          // Replace emoji with description
          processedText = processedText.replace(emoji, description);
          break;
          
        case 'explain':
          // Add explanation after emoji
          const explanation = options.addPauses ? `, ${description},` : ` ${description}`;
          processedText = processedText.replace(emoji, emoji + explanation);
          break;
          
        case 'both':
          // Replace with description and add pause
          const replacement = options.addPauses ? `, ${description},` : description;
          processedText = processedText.replace(emoji, replacement);
          break;
      }
    }

    return processedText;
  }

  /**
   * Get a generic description for unknown emojis
   */
  private static getGenericEmojiDescription(emoji: string): string {
    // Try to get Unicode name or fallback to generic description
    const codePoint = emoji.codePointAt(0);
    if (codePoint) {
      // This is a simplified approach - in a real implementation you might want
      // to use a more comprehensive emoji database
      return 'emoji';
    }
    return 'unknown emoji';
  }

  /**
   * Check if text contains emojis
   */
  public static containsEmojis(text: string): boolean {
    return this.EMOJI_REGEX.test(text);
  }

  /**
   * Count emojis in text
   */
  public static countEmojis(text: string): number {
    const matches = text.match(this.EMOJI_REGEX);
    return matches ? matches.length : 0;
  }

  /**
   * Extract all emojis from text
   */
  public static extractEmojis(text: string): string[] {
    return text.match(this.EMOJI_REGEX) || [];
  }
}
