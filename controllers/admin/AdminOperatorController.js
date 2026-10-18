const OperatorMapping = require("../../models/OperatorMapping");

const getOperatorMappings = async (req, res) => {
  try {
    const mappings = await OperatorMapping.find().sort({ country: 1, service: 1 });

    return res.status(200).json({
      data: mappings,
    });
  } catch (error) {
    console.error("Get operator mappings error:", error);

    return res.status(500).json({
      message: "Unable to retrieve operator mappings",
    });
  }
};

// Create or update — one mapping per (service, country) pair, so saving
// again for an existing pair just overwrites the operator.
const upsertOperatorMapping = async (req, res) => {
  try {
    let { service, country, operator } = req.body;

    if (!service || !country || !operator) {
      return res.status(400).json({
        message: "Service, country, and operator are required",
      });
    }

    service = service.trim().toLowerCase();
    country = country.trim().toLowerCase();
    operator = operator.trim().toLowerCase();

    const mapping = await OperatorMapping.findOneAndUpdate(
      { service, country },
      { $set: { operator } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Operator mapping saved",
      mapping,
    });
  } catch (error) {
    console.error("Upsert operator mapping error:", error);

    return res.status(500).json({
      message: "Unable to save operator mapping",
    });
  }
};

const deleteOperatorMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await OperatorMapping.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        message: "Operator mapping not found",
      });
    }

    return res.status(200).json({
      message: "Operator mapping deleted",
    });
  } catch (error) {
    console.error("Delete operator mapping error:", error);

    return res.status(500).json({
      message: "Unable to delete operator mapping",
    });
  }
};

module.exports = {
  getOperatorMappings,
  upsertOperatorMapping,
  deleteOperatorMapping,
};
