const youngpgService = require("../../services/youngpgService");
const LogCategory = require("../../models/LogCategory");
const LogGroup = require("../../models/LogGroup");
const LogSubgroup = require("../../models/LogSubgroup");
const Setting = require("../../models/Setting");

// Live YoungPG category list, merged with our own curation state — lets the
// admin see everything YoungPG offers and toggle which ones are sellable,
// without needing to keep a separate "add category" step.
const getAllCategories = async (req, res) => {
  try {
    const [liveCategories, ours] = await Promise.all([
      youngpgService.getCategories(),
      LogCategory.find(),
    ]);

    const ourByCategoryId = new Map(ours.map((c) => [c.categoryId, c]));

    const merged = liveCategories.map((c) => ({
      categoryId: c.id,
      slug: c.slug,
      title: c.title,
      image: c.image,
      isEnabled: ourByCategoryId.get(c.id)?.isEnabled || false,
    }));

    return res.status(200).json({ categories: merged });
  } catch (error) {
    console.error("Get all log categories error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Unable to retrieve categories",
    });
  }
};

const setCategoryEnabled = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { slug, title, image, isEnabled } = req.body;

    const category = await LogCategory.findOneAndUpdate(
      { categoryId: Number(categoryId) },
      { $set: { slug, title, image, isEnabled: Boolean(isEnabled) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Category updated",
      category,
    });
  } catch (error) {
    console.error("Set log category enabled error:", error);

    return res.status(500).json({
      message: "Unable to update category",
    });
  }
};

const getLogsMarkup = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "logsFlatMarkup" });
    const value = Number(setting?.value);

    return res.status(200).json({
      value: Number.isFinite(value) ? value : 0,
    });
  } catch (error) {
    console.error("Get logs markup error:", error);

    return res.status(500).json({
      message: "Unable to retrieve markup",
    });
  }
};

const updateLogsMarkup = async (req, res) => {
  try {
    const { value } = req.body;
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return res.status(400).json({
        message: "Value must be a non-negative number",
      });
    }

    await Setting.findOneAndUpdate(
      { key: "logsFlatMarkup" },
      { $set: { value: numericValue } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Markup updated",
      value: numericValue,
    });
  } catch (error) {
    console.error("Update logs markup error:", error);

    return res.status(500).json({
      message: "Unable to update markup",
    });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await LogGroup.find().sort({ order: 1, title: 1 });

    return res.status(200).json({ groups });
  } catch (error) {
    console.error("Get log groups error:", error);

    return res.status(500).json({
      message: "Unable to retrieve groups",
    });
  }
};

const createGroup = async (req, res) => {
  try {
    const { title, order, categoryIds, isEnabled } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const group = await LogGroup.create({
      title: title.trim(),
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      categoryIds: Array.isArray(categoryIds) ? categoryIds.map(Number) : [],
      isEnabled: isEnabled !== false,
    });

    return res.status(201).json({ message: "Group created", group });
  } catch (error) {
    console.error("Create log group error:", error);

    return res.status(500).json({
      message: "Unable to create group",
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, order, categoryIds, isEnabled } = req.body;

    const group = await LogGroup.findByIdAndUpdate(
      groupId,
      {
        $set: {
          ...(title !== undefined && { title: title.trim() }),
          ...(order !== undefined && { order: Number(order) || 0 }),
          ...(categoryIds !== undefined && { categoryIds: categoryIds.map(Number) }),
          ...(isEnabled !== undefined && { isEnabled: Boolean(isEnabled) }),
        },
      },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    return res.status(200).json({ message: "Group updated", group });
  } catch (error) {
    console.error("Update log group error:", error);

    return res.status(500).json({
      message: "Unable to update group",
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    await LogGroup.findByIdAndDelete(groupId);

    return res.status(200).json({ message: "Group deleted" });
  } catch (error) {
    console.error("Delete log group error:", error);

    return res.status(500).json({
      message: "Unable to delete group",
    });
  }
};

const getSubgroups = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const subgroups = await LogSubgroup.find({ categoryId: Number(categoryId) }).sort({ order: 1, title: 1 });

    return res.status(200).json({ subgroups });
  } catch (error) {
    console.error("Get log subgroups error:", error);

    return res.status(500).json({
      message: "Unable to retrieve subgroups",
    });
  }
};

const createSubgroup = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { title, keywords, order, image } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const parsedKeywords = (Array.isArray(keywords) ? keywords : []).map((k) => k.trim()).filter(Boolean);
    if (parsedKeywords.length === 0) {
      return res.status(400).json({ message: "At least one keyword is required" });
    }

    const subgroup = await LogSubgroup.create({
      categoryId: Number(categoryId),
      title: title.trim(),
      keywords: parsedKeywords,
      image: image?.trim() || null,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
    });

    return res.status(201).json({ message: "Subgroup created", subgroup });
  } catch (error) {
    console.error("Create log subgroup error:", error);

    return res.status(500).json({
      message: "Unable to create subgroup",
    });
  }
};

const updateSubgroup = async (req, res) => {
  try {
    const { subgroupId } = req.params;
    const { title, keywords, order, image } = req.body;

    const parsedKeywords = keywords !== undefined ? keywords.map((k) => k.trim()).filter(Boolean) : undefined;

    const subgroup = await LogSubgroup.findByIdAndUpdate(
      subgroupId,
      {
        $set: {
          ...(title !== undefined && { title: title.trim() }),
          ...(parsedKeywords !== undefined && { keywords: parsedKeywords }),
          ...(order !== undefined && { order: Number(order) || 0 }),
          ...(image !== undefined && { image: image?.trim() || null }),
        },
      },
      { new: true }
    );

    if (!subgroup) {
      return res.status(404).json({ message: "Subgroup not found" });
    }

    return res.status(200).json({ message: "Subgroup updated", subgroup });
  } catch (error) {
    console.error("Update log subgroup error:", error);

    return res.status(500).json({
      message: "Unable to update subgroup",
    });
  }
};

const deleteSubgroup = async (req, res) => {
  try {
    const { subgroupId } = req.params;
    await LogSubgroup.findByIdAndDelete(subgroupId);

    return res.status(200).json({ message: "Subgroup deleted" });
  } catch (error) {
    console.error("Delete log subgroup error:", error);

    return res.status(500).json({
      message: "Unable to delete subgroup",
    });
  }
};

module.exports = {
  getAllCategories,
  setCategoryEnabled,
  getLogsMarkup,
  updateLogsMarkup,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getSubgroups,
  createSubgroup,
  updateSubgroup,
  deleteSubgroup,
};
