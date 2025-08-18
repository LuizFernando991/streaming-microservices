package helpers

func FilterResolutions(originalHeight int) []int {
	all := []int{1080, 720, 480}
	var res []int
	for _, r := range all {
		if r <= originalHeight && r >= 480 {
			res = append(res, r)
		}
	}
	if len(res) == 0 {
		res = append(res, 480)
	}
	return res
}
