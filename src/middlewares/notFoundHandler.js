const notFoundHandler = (req, res) => {
    res.status(404).json({
        message: `${req.url} ${req.method} not found`
    });
};
export default notFoundHandler;
//# sourceMappingURL=notFoundHandler.js.map