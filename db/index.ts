import * as SQLite from 'expo-sqlite';

export interface BrewingLog {
  id: number;
  recipe_name: string;
  bean: string;
  dripper: string;
  grinder: string;
  grind_size: number;
  total_time: number;
  created_at: string;
  rating?: number | null;
  memo?: string | null;
}

export interface RecipeStep {
  id?: number;
  recipe_id?: number;
  duration: number;
  instruction: string;
  waterAmount: number;
}

export interface Recipe {
  id?: number;
  name: string;
  bean: string;
  grinder: string;
  dripper: string;
  grindSize: number;
  totalWater: number;
  totalTime: number;
  steps: RecipeStep[];
}

const db = SQLite.openDatabaseSync('drip_coffee.db');

export const initDB = async () => {
  try {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS brewing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_name TEXT NOT NULL,
        bean TEXT NOT NULL,
        dripper TEXT,
        grinder TEXT,
        grind_size INTEGER NOT NULL,
        total_time INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        rating INTEGER,
        memo TEXT
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        bean TEXT,
        grinder TEXT,
        dripper TEXT,
        grindSize INTEGER,
        totalWater INTEGER,
        totalTime INTEGER
      );

      CREATE TABLE IF NOT EXISTS recipe_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        instruction TEXT NOT NULL,
        waterAmount INTEGER NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      );
    `);
    console.log('모든 테이블이 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.error('테이블 초기화 중 오류가 발생했습니다.', error);
  }
};

export const addLog = async (log: Omit<BrewingLog, 'id' | 'created_at'>): Promise<void> => {
  await db.runAsync(
    'INSERT INTO brewing_logs (recipe_name, bean, dripper, grinder, grind_size, total_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [log.recipe_name, log.bean, log.dripper, log.grinder, log.grind_size, log.total_time, new Date().toISOString()]
  );
};

export type LogSortOption = 'latest' | 'rating_desc' | 'rating_asc';

export const getLogs = async (options: {
  sortBy?: LogSortOption;
  filterByRecipe?: string | null;
} = {}): Promise<BrewingLog[]> => {
  const { sortBy = 'latest', filterByRecipe = null } = options;

  let query = 'SELECT * FROM brewing_logs';
  const params: (string | number)[] = [];

  if (filterByRecipe) {
    query += ' WHERE recipe_name = ?';
    params.push(filterByRecipe);
  }

  switch (sortBy) {
    case 'rating_desc':
      query += ' ORDER BY rating DESC, id DESC';
      break;
    case 'rating_asc':
      query += ' ORDER BY rating ASC, id DESC';
      break;
    case 'latest':
    default:
      query += ' ORDER BY id DESC';
      break;
  }

  query += ';';

  try {
    const allRows = await db.getAllAsync<BrewingLog>(query, params);
    return allRows;
  } catch (error) {
    console.error('로그 불러오기 오류', error);
    return [];
  }
};

export const getLogById = async (id: number): Promise<BrewingLog | null> => {
  try {
    const log = await db.getFirstAsync<BrewingLog>('SELECT * FROM brewing_logs WHERE id = ?;', id);
    return log || null;
  } catch (error) {
    console.error(`ID(${id}) 로그 불러오기 오류`, error);
    return null;
  }
};

export const updateLog = async (id: number, rating: number, memo: string) => {
  try {
    await db.runAsync('UPDATE brewing_logs SET rating = ?, memo = ? WHERE id = ?;', rating, memo, id);
    console.log(`ID(${id}) 로그가 성공적으로 업데이트되었습니다.`);
  } catch (error) {
    console.error(`ID(${id}) 로그 업데이트 오류`, error);
    throw error;
  }
};

export const deleteLog = async (id: number) => {
  try {
    await db.runAsync('DELETE FROM brewing_logs WHERE id = ?;', id);
    console.log(`ID(${id}) 로그가 성공적으로 삭제되었습니다.`);
  } catch (error) {
    console.error(`ID(${id}) 로그 삭제 오류`, error);
    throw error;
  }
};

export const getRecipes = async (): Promise<Recipe[]> => {
  try {
    const recipesResult = await db.getAllAsync<Omit<Recipe, 'steps'>>('SELECT * FROM recipes ORDER BY id DESC;');

    const recipesWithSteps: Recipe[] = [];
    for (const recipe of recipesResult) {
      const stepsResult = await db.getAllAsync<RecipeStep>(
        'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY id ASC;',
        [recipe.id!]
      );
      recipesWithSteps.push({ ...recipe, steps: stepsResult });
    }
    return recipesWithSteps;
  } catch (error) {
    console.error('레시피 불러오기 오류', error);
    return [];
  }
};

export const addRecipe = async (recipe: Omit<Recipe, 'id'>) => {
  try {
    await db.execAsync('BEGIN TRANSACTION;');

    const result = await db.runAsync(
      'INSERT INTO recipes (name, bean, grinder, dripper, grindSize, totalWater, totalTime) VALUES (?, ?, ?, ?, ?, ?, ?);',
      recipe.name,
      recipe.bean,
      recipe.grinder,
      recipe.dripper,
      recipe.grindSize,
      recipe.totalWater,
      recipe.totalTime
    );
    const recipeId = result.lastInsertRowId;

    for (const step of recipe.steps) {
      await db.runAsync(
        'INSERT INTO recipe_steps (recipe_id, duration, instruction, waterAmount) VALUES (?, ?, ?, ?);',
        recipeId,
        step.duration,
        step.instruction,
        step.waterAmount
      );
    }

    await db.execAsync('COMMIT;');
    console.log('새로운 레시피가 성공적으로 추가되었습니다.');

  } catch (error) {
    await db.execAsync('ROLLBACK;');
    console.error('레시피 추가 오류, 트랜잭션을 롤백합니다.', error);
    throw error;
  }
};

export const getRecipeById = async (id: number): Promise<Recipe | null> => {
  try {
    const recipeResult = await db.getFirstAsync<Omit<Recipe, 'steps'>>(
      'SELECT * FROM recipes WHERE id = ?;',
      [id]
    );

    if (!recipeResult) {
      return null;
    }

    const stepsResult = await db.getAllAsync<RecipeStep>(
      'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY id ASC;',
      [id]
    );

    return { ...recipeResult, steps: stepsResult };
  } catch (error) {
    console.error(`ID(${id}) 레시피 불러오기 오류`, error);
    return null;
  }
};

export const deleteRecipe = async (id: number) => {
  try {
    await db.runAsync('DELETE FROM recipes WHERE id = ?;', id);
    console.log(`ID(${id}) 레시피가 성공적으로 삭제되었습니다.`);
  } catch (error) {
    console.error(`ID(${id}) 레시피 삭제 오류`, error);
    throw error;
  }
};

export const updateRecipe = async (id: number, recipe: Omit<Recipe, 'id'>) => {
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE recipes SET name = ?, bean = ?, grinder = ?, dripper = ?, grindSize = ?, totalWater = ?, totalTime = ? WHERE id = ?;',
        [recipe.name, recipe.bean, recipe.grinder, recipe.dripper, recipe.grindSize, recipe.totalWater, recipe.totalTime, id]
      );

      await db.runAsync('DELETE FROM recipe_steps WHERE recipe_id = ?;', [id]);
      const stmt = await db.prepareAsync(
        'INSERT INTO recipe_steps (recipe_id, duration, instruction, waterAmount) VALUES (?, ?, ?, ?);'
      );
      try {
        for (const step of recipe.steps) {
          await stmt.executeAsync([id, step.duration, step.instruction, step.waterAmount]);
        }
      } finally {
        await stmt.finalizeAsync();
      }
    });

    console.log(`ID(${id}) 레시피 업데이트 완료`);
  } catch (e) {
    console.error(`ID(${id}) 레시피 업데이트 오류`, e);
    throw e;
  }
};
